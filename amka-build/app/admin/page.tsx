"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Activity,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  UserCog,
  Lock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { displayRole, formatMoney, initials } from "@/lib/utils";

type SysStats = {
  totalUsers: number;
  activeUsers: number;
  totalPatients: number;
  totalConsultations: number;
  totalPayments: number;
  totalRevenue: number;
  totalMedications: number;
  lowStockCount: number;
  totalExpenses: number;
};

type RoleDist = { role: string; count: number };
type DailyActivity = { day: string; consultations: number; payments: number };
type AuditEvent = {
  id: string;
  type: string;
  label: string;
  user: string;
  time: string;
};

export default function AdminPage() {
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<SysStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalPatients: 0,
    totalConsultations: 0,
    totalPayments: 0,
    totalRevenue: 0,
    totalMedications: 0,
    lowStockCount: 0,
    totalExpenses: 0,
  });
  const [roleDist, setRoleDist] = useState<RoleDist[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setAccessDenied(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (!profile || !profile.is_active || profile.role !== "ADMIN") {
        setAccessDenied(true);
        return;
      }

      const [usersRes, patientsRes, consultationsRes, paymentsRes, medicationsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("patients").select("*", { count: "exact", head: false }),
        supabase.from("consultations").select("*", { count: "exact", head: false }),
        supabase.from("payments").select("*, patients(*)").order("created_at", { ascending: false }),
        supabase.from("medications").select("*"),
      ]);

      const usersData = (usersRes.data || []) as Profile[];
      const patientsData = (patientsRes.data || []) as import("@/lib/types").Patient[];
      const consultationsData = (consultationsRes.data || []) as import("@/lib/types").Consultation[];
      const paymentsData = (paymentsRes.data || []) as import("@/lib/types").Payment[];
      const medicationsData = (medicationsRes.data || []) as import("@/lib/types").Medication[];

      setUsers(usersData);

      const roleCountMap: Record<string, number> = {};
      usersData.forEach(u => {
        const roleKey = displayRole(u.role);
        roleCountMap[roleKey] = (roleCountMap[roleKey] || 0) + 1;
      });
      setRoleDist(Object.entries(roleCountMap).map(([role, count]) => ({ role, count })));

      const activityMap: Record<string, { consultations: number; payments: number }> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toLocaleDateString("fr-FR", { weekday: "short" });
        activityMap[dayKey] = { consultations: 0, payments: 0 };
      }
      consultationsData.forEach(c => {
        const d = new Date(c.created_at);
        const dayKey = d.toLocaleDateString("fr-FR", { weekday: "short" });
        if (activityMap[dayKey]) activityMap[dayKey].consultations++;
      });
      paymentsData.forEach(p => {
        const d = new Date(p.created_at);
        const dayKey = d.toLocaleDateString("fr-FR", { weekday: "short" });
        if (activityMap[dayKey]) activityMap[dayKey].payments++;
      });
      setDailyActivity(Object.entries(activityMap).map(([day, data]) => ({ day, ...data })));

      const totalRevenue = paymentsData.reduce((sum, p) => sum + (Number(p.montant) || 0), 0);
      const lowStockCount = medicationsData.filter(m => m.stock <= m.threshold).length;
      setStats({
        totalUsers: usersData.length,
        activeUsers: usersData.filter(u => u.is_active).length,
        totalPatients: patientsData.length,
        totalConsultations: consultationsData.length,
        totalPayments: paymentsData.filter(p => p.status === "COMPLETED").length,
        totalRevenue: totalRevenue,
        totalMedications: medicationsData.length,
        lowStockCount: lowStockCount,
        totalExpenses: 0,
      });

    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (accessDenied) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error/10 text-error">
            <Lock size={40} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-text">Accès Refusé</h2>
            <p className="text-muted max-w-md">Cette section est réservée aux administrateurs.</p>
          </div>
          <Link href="/dashboard" className="btn-primary">Retour au tableau de bord</Link>
        </div>
      </AppShell>
    );
  }

  if (loading) return <AppShell><div className="p-8 grid grid-cols-1 gap-6 md:grid-cols-4">{Array.from({length: 8}).map((_,i)=><div key={i} className="skeleton h-32" />)}</div></AppShell>;

  const profitMargin = stats.totalRevenue > 0 ? Math.round(((stats.totalRevenue - stats.totalExpenses) / stats.totalRevenue) * 100) : 0;

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/5 to-transparent p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={22} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Administration Système</span>
            </div>
            <h1 className="text-3xl font-black text-text tracking-tight">Centre de Contrôle AMKA</h1>
            <p className="text-sm text-muted max-w-xl">Supervision globale et gestion des accès</p>
          </div>
          <button onClick={() => void fetchData()} disabled={refreshing} className="flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-4 py-2 text-xs font-bold text-text hover:bg-primary/5 transition-all active:scale-95">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Actualiser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mt-6">
        {[
          { label: "Utilisateurs", value: stats.totalUsers, sub: `${stats.activeUsers} actifs`, icon: Users, tone: "primary" },
          { label: "Patients", value: stats.totalPatients, sub: "Dossiers actifs", icon: Activity, tone: "secondary" },
          { label: "Revenus", value: formatMoney(stats.totalRevenue), sub: `Marge : ${profitMargin}%`, icon: TrendingUp, tone: "success" },
          { label: "Alertes Stock", value: stats.lowStockCount, sub: `sur ${stats.totalMedications} réf.`, icon: AlertTriangle, tone: "error" },
        ].map((card) => {
          const Icon = card.icon;
          const toneClasses: Record<string, string> = { primary: "bg-primary/10 text-primary", secondary: "bg-secondary/10 text-secondary", success: "bg-success/10 text-success", error: "bg-error/10 text-error" };
          return (
            <div key={card.label} className="medical-card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">{card.label}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[card.tone]}`}><Icon size={18} /></div>
              </div>
              <div>
                <p className="text-2xl font-black text-text leading-tight">{card.value}</p>
                <p className="text-xs text-muted mt-0.5 font-medium">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
        <section className="medical-card overflow-hidden flex flex-col">
          <div className="border-b border-border p-5 flex items-center justify-between">
            <h3 className="text-base font-bold text-text">Comptes Utilisateurs</h3>
            <Link href="/users" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">Gérer <ArrowUpRight size={12} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="table-head">
                <tr><th className="px-5 py-3">Utilisateur</th><th className="px-5 py-3">Rôle</th><th className="px-5 py-3">Statut</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.slice(0, 6).map((u) => (
                  <tr key={u.id} className="hover:bg-surface-soft transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{initials(u.first_name, u.last_name)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text truncate">{u.first_name} {u.last_name}</p>
                          <p className="text-[10px] text-muted truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><Badge tone={u.role === "ADMIN" ? "error" : "primary"}>{displayRole(u.role)}</Badge></td>
                    <td className="px-5 py-3">{u.is_active ? <span className="text-xs font-bold text-success flex items-center gap-1"><CheckCircle2 size={12}/> Actif</span> : <span className="text-xs font-bold text-error flex items-center gap-1"><XCircle size={12}/> Inactif</span>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="medical-card p-6 flex flex-col gap-4">
          <h3 className="text-base font-bold text-text">Journal d&apos;Audit Système</h3>
          {auditEvents.length === 0 ? <EmptyState title="Aucune activité récente" /> : (
            <div className="relative border-l-2 border-primary/15 pl-5 space-y-5">
              {auditEvents.map((ev) => (
                <div key={ev.id} className="relative group">
                  <div className={`absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${ev.type === "payment" ? "bg-success" : "bg-primary"}`} />
                  <p className="text-xs font-semibold text-text">{ev.label}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted font-medium">
                    <span className="flex items-center gap-1"><UserCog size={10} /> {ev.user}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {ev.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="medical-card p-6 mt-6 bg-warning/5 border-warning/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-warning text-warning">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-base font-bold text-text">Maintenance du Système</h3>
        </div>
        <p className="text-xs text-muted mb-4">
          Le module de résultats nécessite la catégorie <strong className="text-text">"Acte Médical"</strong> pour fonctionner.
          Si les résultats ne s'affichent pas, activez-la ici.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setRefreshing(true);
              try {
                const { error } = await supabase.from("exams").insert({ name: "Acte Médical", is_active: true });
                if (error) throw error;
                alert("La catégorie 'Acte Médical' a été créée avec succès !");
              } catch (e: any) {
                alert("Erreur de permission : Vous devez créer l'examen 'Acte Médical' manuellement dans le tableau de bord Supabase (SQL Editor).");
              } finally {
                setRefreshing(false);
              }
            }}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Activer "Acte Médical"
          </button>
        </div>
      </section>

      <section className="medical-card p-6 mt-6">
        <h3 className="text-base font-bold text-text mb-4">Actions Administrateur (et Maintenance)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { href: "/admin", label: "Tableau de Bord", desc: "Stats et santé système", icon: LayoutGrid },
            { href: "/users", label: "Gestion Utilisateurs", desc: "Comptes et rôles", icon: UserCog },
            { href: "/admin/act-types", label: "Catalogue Actes", desc: "Prix et catégories", icon: Activity },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-start justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 hover:bg-primary/10 transition-all group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary"><item.icon size={18} /></div>
                <div>
                  <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">{item.label}</p>
                  <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="shrink-0 mt-0.5 text-muted group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
