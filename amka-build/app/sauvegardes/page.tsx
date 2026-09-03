"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Plus, Download, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Backup } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";
import { CENTER_INFO } from "@/lib/constants";
import { logAudit, logActivity } from "@/lib/audit";

const BACKUP_TABLES = [
  "patients", "consultations", "payments", "medications", "expenses", "sales",
  "receptions", "laboratory_exams", "eg_exams", "ecg_exams", "radiology_exams",
  "kinesitherapie_sessions", "surgeries", "hospitalizations", "nursing_care",
  "plasters", "dressings", "pharmacy_suppliers", "pharmacy_purchases",
  "audit_logs", "notifications", "center_settings",
];

export default function SauvegardesPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("backups").select("*").order("created_at", { ascending: false });
    setBackups((data ?? []) as Backup[]);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchBackups(); }, [fetchBackups]);

  async function buildSnapshot() {
    const snapshot: Record<string, unknown> = {
      center: CENTER_INFO.name,
      exported_at: new Date().toISOString(),
      tables: {} as Record<string, unknown>,
    };
    for (const table of BACKUP_TABLES) {
      const { data } = await supabase.from(table).select("*").limit(1000);
      (snapshot.tables as Record<string, unknown>)[table] = data ?? [];
    }
    return snapshot;
  }

  function downloadJson(filename: string, data: unknown) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return blob.size;
  }

  async function createBackup() {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const filename = `amka_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const snapshot = await buildSnapshot();
    const size = downloadJson(filename, snapshot);

    await supabase.from("backups").insert({
      filename,
      size_bytes: size,
      status: "COMPLETED",
      created_by: user?.id ?? null,
    });

    await logAudit({ action: "BACKUP", module: "sauvegardes", details: { filename, size } });
    await logActivity({ action: "Sauvegarde créée", module: "sauvegardes", details: filename });

    setCreating(false);
    setToast({ tone: "success", message: `Sauvegarde ${filename} téléchargée (${BACKUP_TABLES.length} tables).` });
    void fetchBackups();
  }

  async function redownloadBackup() {
    setCreating(true);
    const filename = `amka_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const snapshot = await buildSnapshot();
    downloadJson(filename, snapshot);
    setCreating(false);
    setToast({ tone: "success", message: "Export instantané téléchargé." });
  }

  return (
    <AppShell>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      <PageHeader
        title="Sauvegardes"
        subtitle={`Export et archivage — ${CENTER_INFO.name}`}
        icon={Database}
        actions={
          <>
            <button onClick={() => void redownloadBackup()} disabled={creating} className="btn-secondary"><Download size={16} /> Export rapide</button>
            <button onClick={() => void fetchBackups()} className="btn-secondary"><RefreshCw size={16} /></button>
            <button onClick={() => void createBackup()} disabled={creating} className="btn-primary">
              <Plus size={16} /> {creating ? "Création..." : "Nouvelle sauvegarde"}
            </button>
          </>
        }
      />

      <div className="glass-card p-6 mb-6">
        <p className="text-sm text-muted">
          Les sauvegardes exportent <strong>{BACKUP_TABLES.length} tables</strong> (patients, consultations, paiements, modules cliniques, pharmacie, audit…) au format JSON.
          Conservez ces fichiers en lieu sûr et effectuez des sauvegardes régulières.
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6"><div className="skeleton h-12" /></div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-muted">Aucune sauvegarde enregistrée. Créez votre première sauvegarde.</div>
        ) : (
          <table className="premium-table w-full">
            <thead><tr><th>Fichier</th><th>Taille</th><th>Statut</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-sm">{b.filename}</td>
                  <td>{b.size_bytes ? `${(b.size_bytes / 1024).toFixed(1)} Ko` : "-"}</td>
                  <td><Badge tone="success">{b.status}</Badge></td>
                  <td className="text-sm">{formatDate(b.created_at)} {formatTime(b.created_at)}</td>
                  <td>
                    <button onClick={() => void redownloadBackup()} className="p-2 rounded-lg hover:bg-primary/10 text-primary" title="Nouvel export">
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
