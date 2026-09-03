"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck,
  Users,
  Wallet,
  Clock,
  ArrowRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Pill,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import type { Consultation, Patient, Profile, Payment } from "@/lib/types";
import {
  consultationLabel,
  formatMoney,
  formatTime,
  formatDate,
  todayIsoDate,
} from "@/lib/utils";
import { CENTER_INFO } from "@/lib/constants";
import { canAccess, canCreate, getDefaultRouteForRole } from "@/lib/permissions";

type Stats = {
  patients: number;
  consultationsToday: number;
  revenueToday: number;
  stockAlerts: number;
  receptionPending: number;
  hospitalizationsActive: number;
  expensesToday: number;
  kineSessionsToday: number;
};

type RevenuePoint = {
  day: string;
  value: number;
};

type TimelineEvent = {
  id: string;
  type: "patient" | "consultation" | "payment";
  title: string;
  subtitle: string;
  time: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    patients: 0,
    consultationsToday: 0,
    revenueToday: 0,
    stockAlerts: 0,
    receptionPending: 0,
    hospitalizationsActive: 0,
    expensesToday: 0,
    kineSessionsToday: 0,
  });
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const weekTotal = useMemo(
    () => revenue.reduce((sum, item) => sum + item.value, 0),
    [revenue],
  );

  async function fetchData() {
    setLoading(true);
    try {
      // Chargement du profil utilisateur et des données du dashboard
      const { data: authUser } = await supabase.auth.getUser();
      
      if (authUser?.user) {
        // Fetch real profile from database
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.user.id)
          .single();

        if (profileData) {
          setProfile(profileData as Profile);
        } else {
          setProfile({
            id: authUser.user.id,
            email: authUser.user.email ?? "",
            first_name: "Utilisateur",
            last_name: "AMKA",
            role: "ADMIN",
            is_active: true,
            created_at: authUser.user.created_at ?? new Date().toISOString(),
            avatar_url: null,
            phone: null,
            theme_preference: null
          });
        }
      }

      const today = todayIsoDate();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const sevenDaysAgoIso = sevenDaysAgo.toISOString().slice(0, 10);

      // Charger toutes les données en parallèle avec try/catch individuel
      const results = await Promise.allSettled([
        supabase.from("patients").select("*").eq("is_active", true),
        supabase.from("consultations").select("*, patients(*), profiles(*)").order("date_consultation", { ascending: false }).limit(10),
        supabase.from("payments").select("*").gte("created_at", sevenDaysAgoIso + "T00:00:00").lte("created_at", today + "T23:59:59").order("created_at", { ascending: false }),
        supabase.from("medications").select("*"),
        supabase.from("hospitalizations").select("*").eq("status", "EN_COURS"),
        supabase.from("kinesitherapie_sessions").select("*").gte("date_seance", today + "T00:00:00").lte("date_seance", today + "T23:59:59"),
        supabase.from("reception").select("*").eq("status", "EN_ATTENTE"),
        supabase.from("expenses").select("*").gte("created_at", today + "T00:00:00").lte("created_at", today + "T23:59:59")
      ]);

      const getData = (index: number) => results[index].status === "fulfilled" ? results[index].value.data ?? [] : [];

      const patients = getData(0) as Patient[];
      const consultations = getData(1) as Consultation[];
      const payments = getData(2) as Payment[];
      const meds = getData(3) as any[];
      const hospitalizations = getData(4) as any[];
      const kinesitherapie = getData(5) as any[];
      const reception = getData(6) as any[];
      const expenses = getData(7) as any[];

      // Calculer les stats
      const consultationsToday = consultations.filter(c => c.date_consultation.startsWith(today)).length;
      const revenueToday = payments.filter(p => p.created_at.startsWith(today)).reduce((sum, p) => sum + (Number(p.montant) || 0), 0);
      const expensesToday = expenses.reduce((sum, e) => sum + (Number(e.montant) || 0), 0);
      const stockAlerts = meds.filter((m: any) => m.stock < m.threshold).length;
      const hospitalizationsActive = hospitalizations.length;
      const kineSessionsToday = kinesitherapie.length;
      const receptionPending = reception.length;

      // Calculer le graphique des revenus des 7 derniers jours
      const revenueByDay: Record<string, number> = {};
      const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const key = date.toISOString().slice(0, 10);
        revenueByDay[key] = 0;
        return {
          key,
          day: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date),
        };
      });
      
      payments.forEach(p => {
        const dayKey = p.created_at.slice(0, 10);
        if (revenueByDay[dayKey] !== undefined) {
          revenueByDay[dayKey] += (Number(p.montant) || 0);
        }
      });

      const revenueData = days.map(d => ({ day: d.day, value: revenueByDay[d.key] }));

      // Construire la timeline
      const timelineEvents: TimelineEvent[] = [];

      // Ajouter les patients récents
      const recentPatients = patients.slice(0, 5);
      recentPatients.forEach(p => {
        timelineEvents.push({
          id: `patient-${p.id}`,
          type: "patient",
          title: `Nouveau patient : ${p.prenom} ${p.nom}`,
          subtitle: `Dossier #${p.numero_dossier}`,
          time: p.created_at
        });
      });

      // Ajouter les consultations récentes
      consultations.slice(0, 5).forEach(c => {
        timelineEvents.push({
          id: `consultation-${c.id}`,
          type: "consultation",
          title: `Consultation : ${c.patients?.prenom} ${c.patients?.nom}`,
          subtitle: consultationLabel(c.status),
          time: c.date_consultation
        });
      });

      // Ajouter les paiements récents
      payments.slice(0, 5).forEach(p => {
        timelineEvents.push({
          id: `payment-${p.id}`,
          type: "payment",
          title: `Paiement enregistré : ${formatMoney(Number(p.montant))}`,
          subtitle: `${p.type}`,
          time: p.created_at
        });
      });

      // Trier la timeline par date décroissante
      timelineEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // Mettre à jour les états
      setStats({
        patients: patients.length,
        consultationsToday,
        revenueToday,
        stockAlerts,
        receptionPending,
        hospitalizationsActive,
        expensesToday,
        kineSessionsToday
      });

      setConsultations(consultations);
      setPatients(patients);
      setRevenue(revenueData);
      setTimelineEvents(timelineEvents);
    } catch (error) {
      console.error("Erreur lors du chargement des données :", error);
    }
    setLoading(false);
  }

  useEffect(() => { void fetchData(); }, []);

  useEffect(() => {
    if (profile && !canAccess(profile.role, "dashboard")) {
      router.replace(getDefaultRouteForRole(profile.role));
    }
  }, [profile, router]);

  // Format date helper for french greeting
  const longDateStr = useMemo(() => {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  return (
    <AppShell>
      {/* Humanized Welcome Banner */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6 rounded-2xl border border-primary/10">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-text tracking-tight">
            {profile
              ? `Bonjour ${profile.first_name} !`
              : "Bonjour !"}
          </h2>
          <p className="text-xs text-muted max-w-xl">
            {profile?.role === "RECEPTIONIST" &&
              "Prêt à accueillir et enregistrer les patients du jour ? Retrouvez la liste des dossiers cliniques ci-dessous."}
            {profile?.role === "MEDECIN_DIRECTEUR" &&
              "Vos consultations en attente et l'activité clinique en temps réel de votre établissement."}
            {profile?.role === "PHARMACIEN" &&
              "Gérez l'inventaire des médicaments et effectuez les ventes quotidiennes en toute simplicité."}
            {profile?.role === "COMPTABLE" &&
              "Analysez les flux financiers, enregistrez les charges d'exploitation et téléchargez le grand livre."}
            {profile?.role === "PERCEPTEUR" &&
              "Percevez les paiements des patients et imprimez les reçus officiels en temps réel."}
            {profile?.role === "ADMIN" &&
              "Supervisez l'intégralité du système médical, contrôlez les stocks et administrez les utilisateurs."}
            {!profile && "Bienvenue sur la plateforme de gestion du centre de réadaptation."}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-start md:items-end">
          <span className="text-xs font-bold text-muted uppercase tracking-widest">
            Date d'aujourd'hui
          </span>
          <span className="text-base font-bold text-text mt-1">{longDateStr}</span>
        </div>
      </div>

      {/* Main Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Patients actifs"
              value={stats.patients}
              helper="Dossiers ouverts"
              icon={Users}
              tone="primary"
            />
            <StatCard
              label="Consultations (Jour)"
              value={stats.consultationsToday}
              helper={`${stats.kineSessionsToday} séances kiné`}
              icon={CalendarCheck}
              tone="secondary"
            />
            <StatCard
              label="Revenus (Jour)"
              value={formatMoney(stats.revenueToday)}
              helper={`Dépenses: ${formatMoney(stats.expensesToday)}`}
              icon={Wallet}
              tone="success"
            />
            <StatCard
              label="Réception en attente"
              value={stats.receptionPending}
              helper={`${stats.hospitalizationsActive} hospitalisations`}
              icon={AlertTriangle}
              tone={stats.receptionPending > 0 ? "warning" : "primary"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Alertes Stock Pharmacie"
              value={`${stats.stockAlerts}`}
              helper="Articles sous seuil"
              icon={Pill}
              tone="error"
            />
            <StatCard
              label="Hospitalisations actives"
              value={stats.hospitalizationsActive}
              helper="Lits occupés"
              icon={Heart}
              tone="secondary"
            />
            <StatCard
              label="Séances Kiné (Jour)"
              value={stats.kineSessionsToday}
              helper="Rééducation"
              icon={Activity}
              tone="primary"
            />
            <StatCard
              label="Résultat net (Jour)"
              value={formatMoney(stats.revenueToday - stats.expensesToday)}
              helper="Recettes − dépenses"
              icon={TrendingUp}
              tone={stats.revenueToday >= stats.expensesToday ? "success" : "error"}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Consultations Table */}
        <section className="medical-card overflow-hidden lg:col-span-2 flex flex-col">
          <div className="border-b border-border p-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-text">Consultations Récentes</h3>
              <p className="text-xs text-muted mt-0.5">Dernières fiches médicales mises à jour</p>
            </div>
            {(profile && canCreate(profile.role, "consultations")) && (
              <Link href="/consultations/new" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                <span>Planifier</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <div className="flex-1 overflow-x-auto">
            {consultations.length === 0 ? (
              <div className="p-12">
                <EmptyState title="Aucune consultation récente" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="table-head">
                  <tr>
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Médecin</th>
                    <th className="px-6 py-4">Heure</th>
                    <th className="px-6 py-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {consultations.map((consultation) => (
                    <tr key={consultation.id} className="hover:bg-surface-soft transition-colors">
                      <td className="px-6 py-3">
                        <span className="font-bold text-text block">
                          {consultation.patients
                            ? `${consultation.patients.prenom} ${consultation.patients.nom}`
                            : "-"}
                        </span>
                        <span className="text-[10px] text-muted font-bold block mt-0.5">
                          {consultation.patients?.numero_dossier}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-text">
                        {consultation.profiles
                          ? `Dr. ${consultation.profiles.last_name}`
                          : "-"}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-text">
                        {formatTime(consultation.date_consultation)}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          tone={
                            consultation.status === "TERMINEE"
                              ? "success"
                              : consultation.status === "EN_COURS"
                                ? "primary"
                                : consultation.status === "ANNULEE"
                                  ? "error"
                                  : "warning"
                          }
                        >
                          {consultationLabel(consultation.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Weekly Revenue Graph */}
        <section className="medical-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-text">Activité Financière</h3>
            <p className="text-xs text-muted mt-0.5">Chiffre d'affaires consolidé des 7 derniers jours</p>
          </div>
          
          <div className="my-6">
            <p className="text-xs text-muted font-semibold uppercase tracking-widest">Volume total de la semaine</p>
            <p className="text-3xl font-black text-text mt-1">{formatMoney(weekTotal)}</p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4648d4" stopOpacity={1}/>
                    <stop offset="95%" stopColor="#6063ee" stopOpacity={0.25}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#767586', fontWeight: 600 }} />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => [formatMoney(Number(value)), "Revenus"]}
                  labelStyle={{ fontSize: 12, fontWeight: 700 }}
                  contentStyle={{ borderRadius: 12, borderColor: '#c7c4d7', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                  cursor={{ fill: "rgba(70,72,212,0.04)", radius: 6 }}
                />
                <Bar dataKey="value" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity Timeline Feed */}
        <section className="medical-card p-6 lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-text">Journal d'Activité Clinique</h3>
            <p className="text-xs text-muted mt-0.5">Événements enregistrés sur l'établissement en temps réel</p>
          </div>
          
          {timelineEvents.length === 0 ? (
            <div className="py-6">
              <EmptyState title="Aucune activité récente." />
            </div>
          ) : (
            <div className="relative border-l border-border pl-6 space-y-6 py-2">
              {timelineEvents.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Timeline point */}
                  <div className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-primary group-hover:scale-110 transition-transform">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text">{event.title}</span>
                      <span className="text-[10px] text-muted font-bold flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(event.time)}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 font-medium">{event.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dynamic Quick Actions Panel */}
        <section className="medical-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-text">Actions Rapides</h3>
            <p className="text-xs text-muted mt-0.5">Raccourcis configurés pour votre rôle utilisateur</p>
          </div>

          <div className="grid grid-cols-1 gap-3 my-6">
            {profile && canCreate(profile.role, "reception") && (
              <Link
                href="/reception?tab=enregistrement"
                className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Users size={18} />
                  </div>
                  <span className="text-sm font-semibold text-text">Enregistrer un patient</span>
                </div>
                <ArrowRight size={16} className="text-muted" />
              </Link>
            )}

            {profile && canCreate(profile.role, "consultations") && (
              <Link
                href="/consultations/new"
                className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <CalendarCheck size={18} />
                  </div>
                  <span className="text-sm font-semibold text-text">Nouvelle Consultation</span>
                </div>
                <ArrowRight size={16} className="text-muted" />
              </Link>
            )}

            {profile && canCreate(profile.role, "perception") && (
              <Link
                href="/perception/new"
                className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Wallet size={18} />
                  </div>
                  <span className="text-sm font-semibold text-text">Enregistrer Paiement</span>
                </div>
                <ArrowRight size={16} className="text-muted" />
              </Link>
            )}

            {profile && canAccess(profile.role, "pharmacie") && canCreate(profile.role, "pharmacie") && (
              <Link
                href="/pharmacy"
                className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Pill size={18} />
                  </div>
                  <span className="text-sm font-semibold text-text">Nouvelle Vente Pharmacie</span>
                </div>
                <ArrowRight size={16} className="text-muted" />
              </Link>
            )}

            {profile && canCreate(profile.role, "comptabilite") && (
              <Link
                href="/accounting"
                className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Activity size={18} />
                  </div>
                  <span className="text-sm font-semibold text-text">Enregistrer une Charge</span>
                </div>
                <ArrowRight size={16} className="text-muted" />
              </Link>
            )}
          </div>
          
          <div className="text-[10px] font-semibold text-muted text-center uppercase tracking-wider bg-surface-soft py-2 rounded-xl border border-border/40 select-none">
            {CENTER_INFO.shortName} — {CENTER_INFO.legalForm}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
