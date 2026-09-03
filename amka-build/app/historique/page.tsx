"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Search, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { formatDate, formatTime, formatMoney } from "@/lib/utils";
import { useRealtimeTables } from "@/lib/hooks/useRealtimeTable";

type HistoryItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  module: string;
};

export default function HistoriquePage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const [consultations, payments, receptions] = await Promise.all([
      supabase.from("consultations").select("id, motif, created_at, patients(nom, prenom)").order("created_at", { ascending: false }).limit(50),
      supabase.from("payments").select("id, type, montant, created_at, patients(nom, prenom)").order("created_at", { ascending: false }).limit(50),
      supabase.from("receptions").select("id, motif, service_destine, created_at, patients(nom, prenom)").order("created_at", { ascending: false }).limit(50),
    ]);

    const all: HistoryItem[] = [
      ...(consultations.data ?? []).map((c: Record<string, unknown>) => ({
        id: String(c.id),
        type: "consultation",
        title: `Consultation — ${c.motif}`,
        subtitle: c.patients ? `${(c.patients as { prenom: string; nom: string }).prenom} ${(c.patients as { prenom: string; nom: string }).nom}` : "",
        date: String(c.created_at),
        module: "Consultations",
      })),
      ...(payments.data ?? []).map((p: Record<string, unknown>) => ({
        id: String(p.id),
        type: "payment",
        title: `Paiement — ${p.type} (${formatMoney(Number(p.montant))})`,
        subtitle: p.patients ? `${(p.patients as { prenom: string; nom: string }).prenom} ${(p.patients as { prenom: string; nom: string }).nom}` : "",
        date: String(p.created_at),
        module: "Perception",
      })),
      ...(receptions.data ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        type: "reception",
        title: `Réception — ${r.service_destine}`,
        subtitle: r.patients ? `${(r.patients as { prenom: string; nom: string }).prenom} ${(r.patients as { prenom: string; nom: string }).nom}` : "",
        date: String(r.created_at),
        module: "Réception",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setItems(all);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchHistory(); }, [fetchHistory]);
  useRealtimeTables(["consultations", "payments", "receptions"], fetchHistory);

  const filtered = items.filter((i) =>
    !query.trim() || `${i.title} ${i.subtitle} ${i.module}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AppShell>
      <PageHeader title="Historique" subtitle="Chronologie unifiée de toutes les activités du centre" icon={History}
        actions={<button onClick={() => void fetchHistory()} className="btn-secondary"><RefreshCw size={16} /></button>}
      />

      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input className="input-field pl-10" placeholder="Rechercher dans l'historique..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="glass-card divide-y divide-border/40">
        {loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-muted">Aucun historique trouvé.</p>
        ) : filtered.map((item) => (
          <div key={`${item.type}-${item.id}`} className="p-4 flex items-start justify-between gap-4 hover:bg-primary/5 transition">
            <div>
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-muted mt-0.5">{item.subtitle}</p>
            </div>
            <div className="text-right shrink-0">
              <Badge tone="neutral">{item.module}</Badge>
              <p className="text-xs text-muted mt-1">{formatDate(item.date)} {formatTime(item.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
