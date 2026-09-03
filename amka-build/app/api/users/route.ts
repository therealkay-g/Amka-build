import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { UserRole } from "@/lib/types";

export const dynamic = process.env.CAPACITOR === '1' ? 'auto' : 'force-dynamic';

// Type qui correspond à ce que la page users attend
type ApiProfile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

type CreateUserBody = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
};

type UpdateUserBody = {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
};

async function assertAdmin(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) return { error: "Non authentifié", status: 401 as const };

  try {
    // Vérification cryptographique du JWT via Supabase (côté serveur)
    // IMPORTANT: Ne jamais décoder le JWT manuellement — la signature doit être vérifiée
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("[assertAdmin] Token invalide ou utilisateur introuvable:", userError?.message);
      return { error: "Token invalide ou expiré", status: 401 as const };
    }

    // Récupérer le rôle depuis la table profiles (source de vérité, pas user_metadata)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[assertAdmin] Profil introuvable pour:", user.id);
      return { error: "Profil utilisateur introuvable", status: 401 as const };
    }

    console.log("[assertAdmin] Utilisateur trouvé. Rôle:", profile.role, "Actif:", profile.is_active);

    if (!profile.is_active || profile.role !== "ADMIN") {
      return { error: "Accès réservé aux administrateurs", status: 403 as const };
    }

    return { ok: true as const, currentUserId: user.id };
  } catch (e) {
    console.error("[assertAdmin] Erreur critique lors de la vérification du token:", e);
    return { error: "Erreur de validation du token", status: 401 as const };
  }
}

export async function POST(request: Request) {
  try {
    const guard = await assertAdmin(request);
    if ("error" in guard) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const body = (await request.json()) as CreateUserBody;
    if (!body.email?.trim() || !body.password || body.password.length < 8) {
      return NextResponse.json({ error: "Email et mot de passe (8 caractères min.) requis" }, { status: 400 });
    }

    console.log("[POST] Creating user:", body.email);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        first_name: body.first_name,
        last_name: body.last_name,
        role: body.role,
        is_active: true,
      },
    });

    if (error || !data.user) {
      console.log("[POST] Create user error:", error);
      return NextResponse.json({ error: error?.message ?? "Creation impossible" }, { status: 400 });
    }

    console.log("[POST] User created successfully:", data.user.id);

    return NextResponse.json({ ok: true, userId: data.user.id });
  } catch (error) {
    console.log("[POST] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const guard = await assertAdmin(request);
    if ("error" in guard) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    console.log("[GET] Fetching users...");
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.log("[GET] List users error:", listError);
      return NextResponse.json({ error: listError.message }, { status: 400 });
    }

    console.log("[GET] Found users:", users.length);

    // Le rôle de référence est stocké dans la table profiles (source de vérité).
    const { data: dbProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, role, is_active, created_at");

    if (profilesError) {
      console.log("[GET] Profiles error:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }

    const profileById = new Map((dbProfiles || []).map((p) => [p.id, p]));

    // Convertir les users auth en format ApiProfile
    const profiles: ApiProfile[] = users.map(user => {
      const u = user as { banned_at?: string | null } & typeof user;
      const db = profileById.get(u.id);
      return {
        id: u.id,
        email: db?.email ?? u.email ?? "",
        first_name: db?.first_name ?? u.user_metadata?.first_name ?? "",
        last_name: db?.last_name ?? u.user_metadata?.last_name ?? "",
        role: (db?.role as UserRole) ?? u.user_metadata?.role ?? "RECEPTIONIST",
        is_active: db ? db.is_active !== false : u.user_metadata?.is_active !== false && !u.banned_at,
        created_at: db?.created_at ?? u.created_at ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.log("[GET] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    console.log("[DELETE] Starting user deletion...");
    const guard = await assertAdmin(request);
    
    if ("error" in guard) {
      console.log("[DELETE] Guard error:", guard);
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    console.log("[DELETE] User ID to delete:", userId);

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
    }

    if (userId === guard.currentUserId) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
    }

    // Supprime d'abord les lignes public.users et profiles qui référencent auth.users
    // (contraintes users_id_fkey / profiles_id_fkey bloquent la suppression auth sinon)
    console.log("[DELETE] Deleting legacy users row...");
    const { error: usersTableError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);

    if (usersTableError) {
      console.log("[DELETE] users table delete error (continuing anyway):", usersTableError);
    } else {
      console.log("[DELETE] users row deleted successfully");
    }

    console.log("[DELETE] Deleting profile...");
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.log("[DELETE] Profile delete error (continuing anyway):", profileError);
    } else {
      console.log("[DELETE] Profile deleted successfully");
    }

    // Puis supprime l'utilisateur auth via l'API REST directement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    console.log("[DELETE] Calling Supabase REST API for user deletion...");
    
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
    });

    console.log("[DELETE] Supabase API response status:", deleteRes.status);
    const responseText = await deleteRes.text();
    console.log("[DELETE] Supabase API response text:", responseText);

    if (!deleteRes.ok) {
      return NextResponse.json({ error: `Erreur Supabase: ${deleteRes.status} - ${responseText}` }, { status: 400 });
    }

    console.log("[DELETE] Auth user deleted successfully via REST API");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("[DELETE] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await assertAdmin(request);
    if ("error" in guard) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const body = (await request.json()) as { is_active?: boolean };

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
    }

    // D'abord récupérer l'utilisateur pour conserver les autres metadata
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError || !user) {
      return NextResponse.json({ error: getUserError?.message ?? "Utilisateur non trouvé" }, { status: 404 });
    }

    // Mettre à jour seulement le champ is_active
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(user.user_metadata || {}),
        is_active: body.is_active,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("[PATCH] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const guard = await assertAdmin(request);
    if ("error" in guard) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
    }

    const body = (await request.json()) as UpdateUserBody;
    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    // Récupérer l'utilisateur pour conserver les autres metadata
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !user) {
      return NextResponse.json({ error: getUserError?.message ?? "Utilisateur non trouvé" }, { status: 404 });
    }

    console.log("[PUT] Updating userC:", userId, "with body:", body);

    // Mettre à jour l'email et le user_metadata dans l'auth Supabase
    const { data: updatedUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: body.email.trim(),
      user_metadata: {
        ...(user.user_metadata || {}),
        first_name: body.first_name,
        last_name: body.last_name,
        role: body.role,
      },
    });

    if (authError) {
      console.log("[PUT] Auth update error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    console.log("[PUT] User updated successfully:", updatedUser?.user?.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("[PUT] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
