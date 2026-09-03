"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Search, RefreshCw, Download } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { supabase } from "@/lib/supabase";
import type { UserActivity } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { exportToCsv } from "@/lib/export";

export default function ActivitesPage() {
  const [activities, setActivities] = useState<(UserActivity & { profiles?: { first_name: string; last_name: string } })[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    let req = supabase
      .from("user_activities")
      .select("*, profiles(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (query.trim()) req = req.or(`action.ilike.%${query}%,module.ilike.%${query}%`);
    const { data } = await req;
    setActivities((data ?? []) as typeof activities);
    setLoading(false);
  }, [query]);

  useEffect(() => { void fetchActivities(); }, [fetchActivities]);
  useRealtimeTable("user_activities", fetchActivities, [query]);

  return (
    <AppShell>
      <PageHeader
        title="Activités"
        subtitle="Journal des actions effectuées par tous les utilisateurs"
        icon={Activity}
        actions={
          <>
            <button onClick={() => exportToCsv("activites", ["Utilisateur", "Action", "Module", "Date"], activities.map((a) => [
              a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : "-",
              a.action,
              a.module,
              `${formatDate(a.created_at)} ${formatTime(a.created_at)}`,
            ]))} className="btn-secondary"><Download size={16} /></button>
            <button onClick={() => void fetchActivities()} className="btn-secondary"><RefreshCw size={16} /></button>
          </>
        }
      />

      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input className="input-field pl-10" placeholder="Filtrer..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : (
          <table className="premium-table w-full">
            <thead><tr><th>Utilisateur</th><th>Action</th><th>Module</th><th>Détails</th><th>Date</th></tr></thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td>{a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : "-"}</td>
                  <td className="font-semibold">{a.action}</td>
                  <td>{a.module}</td>
                  <td className="text-sm text-muted">{a.details ?? "-"}</td>
                  <td className="text-sm whitespace-nowrap">{formatDate(a.created_at)} {formatTime(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
