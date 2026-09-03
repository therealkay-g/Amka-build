"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";
import { getModuleForPath } from "@/lib/routes";
import { canAccess, getDefaultRouteForRole } from "@/lib/permissions";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";

import { VocalNotificationListener } from "@/components/notifications/VocalNotificationListener";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setProfile(null);
          setLoading(false);
          router.replace("/login");
          return;
        }

        // Fetch real profile from the database
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData as Profile);
        } else {
          // Fallback to user metadata if profile doesn't exist
          const userMetadata = user.user_metadata;
          setProfile({
            id: user.id,
            email: user.email ?? "",
            first_name: (userMetadata?.first_name as string) || "Utilisateur",
            last_name: (userMetadata?.last_name as string) || "AMKA",
            role: (userMetadata?.role as UserRole) || "ADMIN",
            is_active: true,
            created_at: user.created_at ?? new Date().toISOString(),
            phone: null,
            theme_preference: null,
            avatar_url: null,
          });
        }
      } catch (e) {
        console.error("Erreur lors du chargement du profil:", e);
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!profile || loading) return;
    const module = getModuleForPath(pathname);
    if (module && !canAccess(profile.role, module)) {
      const defaultRoute = getDefaultRouteForRole(profile.role);
      if (pathname !== defaultRoute) {
        router.replace(defaultRoute);
      }
    }
  }, [profile, pathname, loading, router]);

  // Ne rien afficher tant que le profil n'est pas chargé — évite le flash de menus
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <VocalNotificationListener profile={profile} />
      <Sidebar
        profile={profile}
        role={profile?.role ?? null}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:ml-[280px] min-h-screen flex flex-col">
        <Header
          profile={profile}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 mx-auto w-full max-w-7xl space-y-8 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

