import { NextResponse } from "next/server";

export const dynamic = process.env.CAPACITOR === '1' ? 'auto' : 'force-dynamic';

/**
 * @deprecated Route de débogage désactivée.
 * Cette route a été désactivée pour des raisons de sécurité :
 * - Elle exposait un email hardcodé
 * - Elle permettait une élévation de privilèges sans authentification
 * Pour corriger un rôle, utilisez le panneau d'administration /users.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Cette route de débogage a été désactivée. Utilisez /admin/users pour gérer les rôles." },
    { status: 410 }
  );
}
