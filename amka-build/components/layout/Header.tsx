"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, Moon, Sun, X, Pill, DollarSign, Calendar } from "lucide-react";
import type { Profile } from "@/lib/types";
import { displayRole, initials, cn, formatMoney } from "@/lib/utils";
import { getTheme, toggleTheme } from "@/components/providers/ThemeProvider";
import { CENTER_INFO } from "@/lib/constants";
import { loadNotificationPrefs } from "@/lib/preferences";
import type { Notification } from "@/lib/types";

type HeaderProps = {
  profile: Profile | null;
  onMenuClick: () => void;
};

import { supabase } from "@/lib/supabase";

type HeaderNotification = {
  id: string;
  type: "stock" | "payment" | "consultation" | "system" | "exam_result";
  text: string;
  time: string;
  read: boolean;
  entityId?: string;
};

export function Header({ profile, onMenuClick }: HeaderProps) {
  const [greeting, setGreeting] = useState("Bonjour");
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);

  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.id) {
      const saved = localStorage.getItem(`avatar-${profile.id}`);
      if (saved) setAvatar(saved);
    }
  }, [profile?.id]);

  // Load initial notifications
  useEffect(() => {
    async function loadInitial() {
      const dbNotifs: HeaderNotification[] = [];
      try {
        const prefs = profile ? loadNotificationPrefs(profile.id) : null;
        const role = profile?.role;

        const { data: stored } = await supabase
          .from("notifications")
          .select("*")
          .or(profile ? `user_id.eq.${profile.id},user_id.is.null` : "user_id.is.null")
          .order("created_at", { ascending: false })
          .limit(15);

        (stored ?? []).forEach((n: Notification) => {
          // Filter global notifications by role/type if needed
          // For now, we assume system notifications are global.
          // But we can filter based on n.type if we have a mapping.
          dbNotifs.push({
            id: n.id,
            type: n.type === "payment" ? "payment" : n.type === "consultation" ? "consultation" : "system",
            text: n.message,
            time: new Date(n.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
            read: n.is_read,
          });
        });

        // Stock alerts: Only for Pharmacist, Admin, or Medical Director
        if (prefs?.stockAlerts !== false && (role === "PHARMACIEN" || role === "ADMIN" || role === "MEDECIN_DIRECTEUR")) {
          const { data: meds } = await supabase.from("medications").select("name, stock, threshold").eq("is_active", true);
          const lowStock = (meds ?? [])
            .filter((m: { stock: number; threshold: number }) => m.stock <= m.threshold)
            .map((m: { name: string; stock: number }, idx: number) => ({
              id: `stock-${m.name}-${idx}`,
              type: "stock" as const,
              text: `Alerte stock : ${m.name} (${m.stock} restants).`,
              time: "Stock",
              read: false,
            }));
          dbNotifs.push(...lowStock);
        }

        // Consultation alerts: Only for Doctors, Admin, or Medical Director
        if (prefs?.consultationAlerts !== false && (role?.startsWith("MEDECIN") || role === "ADMIN" || role === "MEDECIN_DIRECTEUR")) {
          const { data: consults } = await supabase
            .from("consultations")
            .select("id, motif, created_at, patients(nom, prenom)")
            .order("created_at", { ascending: false })
            .limit(3);
          (consults ?? []).forEach((c: { id: string; motif: string; created_at: string; patients?: { nom: string; prenom: string } | null }) => {
            dbNotifs.push({
              id: `consult-${c.id}`,
              type: "consultation",
              text: `Consultation — ${c.patients?.prenom ?? ""} ${c.patients?.nom ?? ""} : ${c.motif}`,
              time: new Date(c.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
              read: true,
            });
          });
        }

        // Payment alerts: Only for Percepteur, Comptable, Admin, or Medical Director
        if (role === "PERCEPTEUR" || role === "COMPTABLE" || role === "ADMIN" || role === "MEDECIN_DIRECTEUR") {
          const { data: pays } = await supabase
            .from("payments")
            .select("id, montant, type, created_at, patients(nom, prenom)")
            .order("created_at", { ascending: false })
            .limit(3);
          (pays ?? []).forEach((p: { id: string; montant: number; type: string; created_at: string; patients?: { nom: string; prenom: string } | null }) => {
            dbNotifs.push({
              id: `pay-${p.id}`,
              type: "payment",
              text: `Paiement ${formatMoney(Number(p.montant))} — ${p.type} (${p.patients?.prenom ?? ""} ${p.patients?.nom ?? ""})`,
              time: new Date(p.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
              read: true,
            });
          });
        }
      } catch (error) {
        console.warn("Error loading notifications (ignored):", error);
      }

      setNotifications(dbNotifs);
    }
    void loadInitial();

    const channel = supabase
      .channel("header-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload: Record<string, unknown>) => {
        console.log("New notification received:", payload);
        const n = payload.new as Notification;
        if (profile && n.user_id && n.user_id !== profile.id) return;

        // Filter global notifications by role if they have a specific type
        if (!n.user_id) {
          const role = profile?.role;
          if (n.type === "payment" && !(role === "PERCEPTEUR" || role === "COMPTABLE" || role === "ADMIN" || role === "MEDECIN_DIRECTEUR")) return;
          if (n.type === "consultation" && !(role?.startsWith("MEDECIN") || role === "ADMIN" || role === "MEDECIN_DIRECTEUR")) return;
          if (n.type === "stock" && !(role === "PHARMACIEN" || role === "ADMIN" || role === "MEDECIN_DIRECTEUR")) return;
        }

        setNotifications((prev) => [
          {
            id: n.id,
            type: n.type === "payment" ? "payment" : n.type === "consultation" ? "consultation" : "system",
            text: n.message,
            time: "À l'instant",
            read: false,
          },
          ...prev,
        ]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "consultations" }, async (payload: Record<string, unknown>) => {
        const prefs = profile ? loadNotificationPrefs(profile.id) : null;
        const role = profile?.role;
        if (prefs?.consultationAlerts === false || !(role?.startsWith("MEDECIN") || role === "ADMIN" || role === "MEDECIN_DIRECTEUR")) return;
        const row = payload.new as { id: string; patient_id: string; motif: string };
        const { data: p } = await supabase.from("patients").select("nom, prenom").eq("id", row.patient_id).maybeSingle();
        const pName = p ? `${p.prenom} ${p.nom}` : "nouveau patient";
        setNotifications((prev) => [
          {
            id: `consult-rt-${row.id}`,
            type: "consultation",
            text: `Nouvelle consultation — ${pName} : ${row.motif}`,
            time: "À l'instant",
            read: false,
          },
          ...prev,
        ]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, async (payload: Record<string, unknown>) => {
        const role = profile?.role;
        if (!(role === "PERCEPTEUR" || role === "COMPTABLE" || role === "ADMIN" || role === "MEDECIN_DIRECTEUR")) return;
        const row = payload.new as { id: string; patient_id: string; montant: number; type: string };
        const { data: p } = await supabase.from("patients").select("nom, prenom").eq("id", row.patient_id).maybeSingle();
        const pName = p ? `${p.prenom} ${p.nom}` : "patient";
        setNotifications((prev) => [
          {
            id: `pay-rt-${row.id}`,
            type: "payment",
            text: `Paiement de ${formatMoney(Number(row.montant))} — ${row.type} (${pName})`,
            time: "À l'instant",
            read: false,
          },
          ...prev,
        ]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "medications" }, (payload: Record<string, unknown>) => {
        const prefs = profile ? loadNotificationPrefs(profile.id) : null;
        const role = profile?.role;
        if (prefs?.stockAlerts === false || !(role === "PHARMACIEN" || role === "ADMIN" || role === "MEDECIN_DIRECTEUR")) return;
        const row = payload.new as { id: string; name: string; stock: number; threshold: number; is_active: boolean };
        if (row.stock <= row.threshold && row.is_active) {
          setNotifications((prev) => [
            {
              id: `stock-rt-${row.id}-${Date.now()}`,
              type: "stock",
              text: `Stock faible : ${row.name} (${row.stock} restants).`,
              time: "À l'instant",
              read: false,
            },
            ...prev,
          ]);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour >= 18 ? "Bonsoir" : "Bonjour");
  }, []);

  function handleThemeToggle() {
    setThemeState(toggleTheme());
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllAsRead() {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    const unreadIds = notifications.filter((n) => !n.read && !n.id.startsWith("stock-") && !n.id.startsWith("consult-") && !n.id.startsWith("pay-")).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    }
  }

  function getNotificationIcon(type: HeaderNotification["type"]) {
    switch (type) {
      case "stock":
        return <Pill size={16} className="text-warning" />;
      case "payment":
        return <DollarSign size={16} className="text-success" />;
      case "consultation":
        return <Calendar size={16} className="text-primary" />;
      default:
        return <Bell size={16} className="text-primary" />;
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border header-glass px-4 lg:px-8">
      {/* Left items - Mobile Toggle & Search */}
      <div className="flex flex-1 items-center gap-4">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-soft active:scale-95 transition-all lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
        <div className="relative hidden w-full max-w-md md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            className="w-full rounded-full border border-border bg-surface-soft py-2 pl-10 pr-4 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            placeholder={`Rechercher un patient, un service... (${CENTER_INFO.shortName})`}
          />
        </div>
      </div>

      {/* Right items - Notifications, Settings, Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-soft active:scale-95 transition-all relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-error"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-surface shadow-card overflow-hidden z-50 transition-all">
              <div className="flex items-center justify-between border-b border-border bg-surface-soft px-4 py-3">
                <span className="text-sm font-bold text-text">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-border/60">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted">Aucune notification.</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 text-left transition-colors",
                        !notification.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-surface-soft"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface border border-border/40">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-text leading-relaxed">
                            {notification.text}
                          </p>
                          <p className="text-[10px] text-muted font-semibold">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleThemeToggle}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-soft active:scale-95 transition-all"
          aria-label="Changer le thème"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <Link
          href="/profil"
          className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-soft active:scale-95 transition-all overflow-hidden"
          aria-label="Mon profil"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-black text-primary">{initials(profile?.first_name, profile?.last_name)}</span>
          )}
        </Link>

        <div className="mx-1 hidden h-8 w-px bg-border md:block" />

        {/* User profile presentation */}
        {profile && (
          <div className="hidden sm:flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-bold leading-tight text-text">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted mt-0.5">
                {displayRole(profile.role)}
              </p>
              <p className="text-[7px] text-muted/50 font-mono">v3.0.1-stable</p>
            </div>
            <span className="bg-primary/10 text-primary text-[8px] font-black px-2 py-1 rounded-full uppercase">
              {profile.role}
            </span>
          </div>
        )}

        <Link
          href="/profil"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-black text-primary shadow-sm select-none overflow-hidden"
          title={profile ? `${profile.first_name} ${profile.last_name}` : ""}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-black text-primary">{initials(profile?.first_name, profile?.last_name)}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
