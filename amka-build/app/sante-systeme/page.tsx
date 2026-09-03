"use client";

import { useEffect, useState } from "react";
import { Heart, CheckCircle, AlertTriangle, Database, Users, Activity } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useRealtimeTables } from "@/lib/hooks/useRealtimeTable";

type HealthMetric = {
  label: string;
  value: string | number;
  status: "ok" | "warning" | "error";
  icon: React.ElementType;
};

export default function SanteSystemePage() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  async function checkHealth() {
    setLoading(true);
    const checks = await Promise.all([
      supabase.from("patients").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("medications").select("id", { count: "exact", head: true }).eq("is_active", true).filter("stock", "lte", "threshold"),
      supabase.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    ]);

    const [patients, profiles, lowStock, auditToday] = checks;
    const dbOk = !patients.error && !profiles.error;

    setMetrics([
      { label: "Base de données", value: dbOk ? "Connectée" : "Erreur", status: dbOk ? "ok" : "error", icon: Database },
      { label: "Patients actifs", value: patients.count ?? 0, status: "ok", icon: Users },
      { label: "Utilisateurs", value: profiles.count ?? 0, status: "ok", icon: Activity },
      { label: "Alertes stock", value: lowStock.count ?? 0, status: (lowStock.count ?? 0) > 0 ? "warning" : "ok", icon: AlertTriangle },
      { label: "Opérations audit (24h)", value: auditToday.count ?? 0, status: "ok", icon: CheckCircle },
      { label: "Version", value: "2.0.0", status: "ok", icon: Heart },
    ]);
    setLoading(false);
  }

  useEffect(() => { void checkHealth(); }, []);
  useRealtimeTables(["patients", "medications", "audit_logs"], checkHealth);

  return (
    <AppShell>
      <PageHeader title="Santé Système" subtitle="État de la plateforme et indicateurs de performance" icon={Heart} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)
        ) : metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="glass-card p-5 flex items-start gap-4 animate-fade-in">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                m.status === "ok" ? "bg-success/10 text-success" :
                m.status === "warning" ? "bg-warning/10 text-warning" : "bg-error/10 text-error"
              }`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted">{m.label}</p>
                <p className="text-xl font-black mt-1">{m.value}</p>
                <Badge tone={m.status === "ok" ? "success" : m.status === "warning" ? "warning" : "error"}>
                  {m.status === "ok" ? "Opérationnel" : m.status === "warning" ? "Attention" : "Critique"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-6 mt-6">
        <h3 className="font-bold mb-3">Modules synchronisés en temps réel</h3>
        <div className="flex flex-wrap gap-2">
          {["Réception", "Consultations", "Perception", "Laboratoire", "Pharmacie", "Comptabilité", "Dashboard"].map((mod) => (
            <Badge key={mod} tone="primary">{mod}</Badge>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
