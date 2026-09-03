"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, Search, Download, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import type { AuditLog } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { exportToCsv } from "@/lib/export";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let req = supabase
      .from("audit_logs")
      .select("*, profiles(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (query.trim()) req = req.or(`action.ilike.%${query}%,module.ilike.%${query}%`);
    const { data } = await req;
    setLogs((data ?? []) as AuditLog[]);
    setLoading(false);
  }, [query]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);
  useRealtimeTable("audit_logs", fetchLogs, [query]);

  function exportLogs() {
    exportToCsv("audit", ["Date", "Utilisateur", "Action", "Module", "Entité"], logs.map((l) => [
      `${formatDate(l.created_at)} ${formatTime(l.created_at)}`,
      l.profiles ? `${l.profiles.first_name} ${l.profiles.last_name}` : "Système",
      l.action,
      l.module,
      l.entity_type ?? "-",
    ]));
  }

  return (
    <AppShell>
      <PageHeader
        title="Journal d'Audit"
        subtitle="Toutes les opérations du système sont enregistrées ici"
        icon={Shield}
        actions={
          <>
            <button onClick={exportLogs} className="btn-secondary"><Download size={16} /> Exporter</button>
            <button onClick={() => void fetchLogs()} className="btn-secondary"><RefreshCw size={16} /></button>
          </>
        }
      />

      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input className="input-field pl-10" placeholder="Filtrer par action ou module..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : logs.length === 0 ? (
          <div className="p-12"><EmptyState title="Aucun log d'audit" description="Les opérations apparaîtront ici automatiquement." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="premium-table w-full">
              <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Module</th><th>Entité</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm whitespace-nowrap">{formatDate(log.created_at)}<br /><span className="text-xs text-muted">{formatTime(log.created_at)}</span></td>
                    <td>{log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : "Système"}</td>
                    <td><Badge tone="primary">{log.action}</Badge></td>
                    <td>{log.module}</td>
                    <td className="text-sm text-muted">{log.entity_type ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
