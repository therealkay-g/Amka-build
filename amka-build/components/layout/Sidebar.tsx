"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Receipt,
  Pill,
  BarChart3,
  LogOut,
  X,
  Settings,
  LayoutGrid,
  ClipboardList,
  FlaskConical,
  Activity,
  HeartPulse,
  Scan,
  Dumbbell,
  Scissors,
  BedDouble,
  Syringe,
  Bandage,
  Layers,
  FileText,
  Printer,
  Shield,
  History,
  Database,
  Heart,
  UserCircle,
  ChevronDown,
  Send,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { ModuleKey, UserRole, Profile } from "@/lib/types";
import { cn, displayRole, initials } from "@/lib/utils";
import { canAccess } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";
import { CENTER_INFO } from "@/lib/constants";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  module: ModuleKey;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, module: "dashboard" },
      { href: "/reception", label: "Réception", icon: ClipboardList, module: "reception" },
    ],
  },
  {
    title: "Soins",
    items: [
      { href: "/consultations", label: "Consultations", icon: Stethoscope, module: "consultations" },
      { href: "/kinesitherapie", label: "Kinésithérapie", icon: Dumbbell, module: "kinesitherapie" },
      { href: "/hospitalisation", label: "Hospitalisation", icon: BedDouble, module: "hospitalisation" },
      { href: "/soins-infirmiers", label: "Soins infirmiers", icon: Syringe, module: "soins_infirmiers" },
      { href: "/platres", label: "Plâtres", icon: Layers, module: "plâtres" },
      { href: "/pansements", label: "Pansements", icon: Bandage, module: "pansements" },
    ],
  },
  {
    title: "Examens",
    items: [
      { href: "/laboratoire", label: "Laboratoire", icon: FlaskConical, module: "laboratoire" },
      { href: "/eg", label: "EG", icon: Activity, module: "eg" },
      { href: "/ecg", label: "ECG", icon: HeartPulse, module: "ecg" },
      { href: "/radiologie", label: "Radiologie", icon: Scan, module: "radiologie" },
    ],
  },
  {
    title: "Chirurgie",
    items: [
      { href: "/chirurgie", label: "Chirurgie", icon: Scissors, module: "chirurgie" },
    ],
  },
  {
    title: "Communications",
    items: [
      { href: "/messages", label: "Messagerie", icon: MessageSquare, module: "messaging" },
      { href: "/transfert-fichiers", label: "Transfert de fichiers", icon: Send, module: "file_transfers" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/perception", label: "Perception", icon: Receipt, module: "perception" },
      { href: "/pharmacy", label: "Pharmacie", icon: Pill, module: "pharmacie" },
      { href: "/accounting", label: "Comptabilité", icon: BarChart3, module: "comptabilite" },
    ],
  },
  {
    title: "Rapports & Admin",
    items: [
      { href: "/rapports", label: "Rapports", icon: FileText, module: "rapports" },
      { href: "/impression", label: "Impression", icon: Printer, module: "impression" },
      { href: "/admin", label: "Administration", icon: LayoutGrid, module: "administration" },
      { href: "/audit", label: "Audit", icon: Shield, module: "audit" },
      { href: "/sauvegardes", label: "Sauvegardes", icon: Database, module: "sauvegardes" },
      { href: "/sante-systeme", label: "Santé système", icon: Heart, module: "sante_systeme" },
      { href: "/historique", label: "Historique", icon: History, module: "historique" },
      { href: "/activites", label: "Activités", icon: Activity, module: "activites" },
    ],
  },
  {
    title: "Compte",
    items: [
      { href: "/profil", label: "Mon Profil", icon: UserCircle, module: "profil" },
      { href: "/settings", label: "Paramètres", icon: Settings, module: "parametres" },
    ],
  },
];

type SidebarProps = {
  profile: Profile | null;
  role: UserRole | null;
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ profile, role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      const saved = localStorage.getItem(`avatar-${profile.id}`);
      if (saved) setAvatar(saved);
    }
  }, [profile?.id]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleGroup(title: string) {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-border sidebar-glass py-5 shadow-glass transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-4 flex items-center justify-between px-5">
          <Logo size="lg" />
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-soft text-muted lg:hidden"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Profile Card */}
        {profile && (
          <div className="mx-3 mb-4 rounded-xl bg-surface-soft p-3 border border-border/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-sm font-black text-primary overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials(profile.first_name, profile.last_name)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text">{profile.first_name} {profile.last_name}</p>
                <p className="truncate text-[11px] text-muted">{profile.email}</p>
              </div>
            </div>
          </div>
        )}

        <p className="px-5 mb-4 text-[10px] font-bold uppercase tracking-widest text-muted/70">
          {CENTER_INFO.shortName}
        </p>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => canAccess(role, item.module));
            if (visibleItems.length === 0) return null;
            const isCollapsed = collapsed[group.title];

            return (
              <div key={group.title} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted/80 hover:text-primary transition"
                >
                  {group.title}
                  <ChevronDown size={12} className={cn("transition-transform", isCollapsed && "-rotate-90")} />
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const Icon = item.icon;
                      const isAdmin = item.href === "/admin";
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 relative group",
                            active
                              ? "bg-primary/12 text-primary shadow-sm"
                              : isAdmin
                              ? "text-primary/70 hover:bg-primary/8 hover:text-primary"
                              : "text-muted hover:bg-surface-soft hover:text-text"
                          )}
                        >
                          <Icon
                            size={18}
                            className={cn(
                              "shrink-0 transition-transform duration-300 group-hover:scale-110",
                              active && "text-primary"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                          {active && (
                            <div className="absolute left-0 top-1/4 h-1/2 w-1 rounded-r-full bg-primary" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {role && (
          <div className="mx-3 mb-3 rounded-xl glass-card p-3 border border-border/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Rôle actuel</p>
            <p className="text-xs font-bold text-text mt-0.5">{displayRole(role)}</p>
          </div>
        )}

        <div className="mx-3 border-t border-border pt-3">
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-error/80 hover:text-error hover:bg-error/5 transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}
