"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Search, Printer, RefreshCw, TrendingUp, DollarSign,
  CheckCircle, Receipt, FlaskConical, Pill, Edit, Trash2, AlertTriangle, X
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Payment } from "@/lib/types";
import { formatMoney, formatDate, paymentLabel } from "@/lib/utils";
import { logAudit, logActivity, createNotification } from "@/lib/audit";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { exportToCsv, printReceipt as printReceiptPremium } from "@/lib/export";

const MODE_LABELS: Record<Payment["mode_paiement"], string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement",
  INSURANCE: "Assurance",
};

async function printReceipt(payment: Payment) {
  const p = payment.patients;
  await printReceiptPremium({
    receiptNumber: payment.id.slice(0, 8).toUpperCase(),
    patientName: p ? `${p.prenom} ${p.nom}` : "—",
    patientDossier: p?.numero_dossier ?? "—",
    type: payment.type,
    mode: MODE_LABELS[payment.mode_paiement] ?? payment.mode_paiement,
    amount: payment.montant,
    date: formatDate(payment.created_at),
    time: new Date(payment.created_at).toLocaleTimeString("fr-FR"),
    notes: payment.notes ?? undefined,
  });
}

export default function PerceptionPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Modals state
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<{
    montant: string;
    mode_paiement: Payment["mode_paiement"];
    type: string;
    status: Payment["status"];
    notes: string;
  }>({
    montant: "",
    mode_paiement: "CASH",
    type: "",
    status: "COMPLETED",
    notes: "",
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payments")
      .select("*, patients(*)")
      .order("created_at", { ascending: false });
    if (error) setToast({ tone: "error", message: error.message });
    setPayments((data ?? []) as Payment[]);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchPayments(); }, [fetchPayments]);

  useRealtimeTable("payments", fetchPayments);

  const totalCompleted = payments
    .filter(p => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.montant, 0);
  const totalPending = payments
    .filter(p => p.status === "PENDING")
    .reduce((sum, p) => sum + p.montant, 0);

  function exportCsv() {
    const rows = payments.map(p => [
      p.patients ? `${p.patients.prenom} ${p.patients.nom}` : "-",
      p.patients?.numero_dossier || "-",
      p.type,
      p.montant,
      paymentLabel(p.status),
      p.created_at
    ]);
    exportToCsv("perception", ["Patient", "Dossier", "Type", "Montant", "Statut", "Date"], rows);
    void logAudit({ action: "EXPORT", module: "perception", details: { format: "csv" } });
  }

  function openEdit(payment: Payment) {
    setEditingPayment(payment);
    setEditForm({
      montant: String(payment.montant),
      mode_paiement: payment.mode_paiement,
      type: payment.type,
      status: payment.status,
      notes: payment.notes ?? "",
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPayment) return;
    setSaving(true);
    const numAmount = parseFloat(editForm.montant) || 0;

    const { error } = await supabase
      .from("payments")
      .update({
        montant: numAmount,
        mode_paiement: editForm.mode_paiement,
        type: editForm.type.trim(),
        status: editForm.status,
        notes: editForm.notes.trim() || null,
      })
      .eq("id", editingPayment.id);

    setSaving(false);
    if (error) {
      setToast({ tone: "error", message: error.message });
      return;
    }

    await logAudit({
      action: "UPDATE",
      module: "perception",
      entityType: "payments",
      entityId: editingPayment.id,
      details: { oldAmount: editingPayment.montant, newAmount: numAmount, status: editForm.status }
    });
    await logActivity({ action: "Modification paiement", module: "perception", details: `Paiement ${editingPayment.id.slice(0, 8)}` });

    setToast({ tone: "success", message: "Paiement modifié avec succès." });
    setEditingPayment(null);
    void fetchPayments();
  }

  async function handleDeletePayment() {
    if (!confirmDelete) return;
    setSaving(true);

    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", confirmDelete.id);

    setSaving(false);
    if (error) {
      // Si la suppression est refusée en BDD (ex: FK), passer le statut en CANCELLED
      const { error: updateErr } = await supabase
        .from("payments")
        .update({ status: "CANCELLED" })
        .eq("id", confirmDelete.id);
      if (updateErr) {
        setToast({ tone: "error", message: updateErr.message });
      } else {
        setToast({ tone: "success", message: "Paiement annulé." });
      }
    } else {
      setToast({ tone: "success", message: "Paiement supprimé." });
    }

    await logAudit({
      action: "DELETE",
      module: "perception",
      entityType: "payments",
      entityId: confirmDelete.id,
      details: { amount: confirmDelete.montant }
    });
    await logActivity({ action: "Suppression paiement", module: "perception", details: `Paiement ${confirmDelete.id.slice(0, 8)}` });

    setConfirmDelete(null);
    void fetchPayments();
  }

  return (
    <AppShell>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      <PageHeader
        title="Perception"
        subtitle="Encaissement des frais et synchronisation comptable en temps réel"
        icon={Receipt}
        actions={
          <>
            <Link href="/perception/examens" className="btn-primary flex items-center gap-2"><FlaskConical size={16} /> Examens à facturer</Link>
            <Link href="/perception/prescriptions" className="btn-primary flex items-center gap-2"><Pill size={16} /> Prescriptions à facturer</Link>
            <button onClick={exportCsv} className="btn-secondary">Exporter CSV</button>
            <Link href="/perception/new" className="btn-primary"><Plus size={16} /> Nouvelle perception</Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Encaissé", value: formatMoney(totalCompleted), icon: CheckCircle, tone: "text-success" },
          { label: "En attente", value: formatMoney(totalPending), icon: TrendingUp, tone: "text-warning" },
          { label: "Transactions", value: payments.length, icon: DollarSign, tone: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-5 flex items-center gap-4 animate-fade-in">
            <s.icon className={s.tone} size={22} />
            <div>
              <p className="text-xs font-bold uppercase text-muted">{s.label}</p>
              <p className="text-2xl font-black">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-border p-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input className="input-field pl-10" placeholder="Rechercher..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {(["PENDING", "COMPLETED", "CANCELLED"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${filterStatus === s ? "border-primary bg-primary text-white" : "border-border text-muted"}`}>
              {paymentLabel(s)}
            </button>
          ))}
          <button onClick={() => void fetchPayments()} className="btn-secondary"><RefreshCw size={14} /></button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14" />)}</div>
        ) : (() => {
          let filtered = payments;
          if (filterStatus) {
            filtered = filtered.filter(p => p.status === filterStatus);
          }
          if (query) {
            const q = query.toLowerCase();
            filtered = filtered.filter(p =>
              (p.patients?.nom.toLowerCase().includes(q) ||
                p.patients?.prenom.toLowerCase().includes(q) ||
                p.patients?.numero_dossier.toLowerCase().includes(q) ||
                p.type.toLowerCase().includes(q))
            );
          }
          if (filtered.length === 0) {
            return (
              <div className="p-12">
                <EmptyState
                  title="Aucune perception"
                  description={
                    payments.length === 0
                      ? "Enregistrez un paiement pour débloquer les services."
                      : "Aucun résultat pour votre recherche."
                  }
                />
              </div>
            );
          }
          return (
            <div className="overflow-x-auto">
              <table className="premium-table w-full">
                <thead><tr><th>Patient</th><th>Type</th><th>Montant</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td><p className="font-bold">{p.patients ? `${p.patients.prenom} ${p.patients.nom}` : "-"}</p><p className="text-xs text-muted">{p.patients?.numero_dossier}</p></td>
                      <td>{p.type}</td>
                      <td className="font-black">{formatMoney(p.montant)}</td>
                      <td><Badge tone={p.status === "COMPLETED" ? "success" : p.status === "PENDING" ? "warning" : "error"}>{paymentLabel(p.status)}</Badge></td>
                      <td className="text-sm text-muted">{formatDate(p.created_at)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            title="Modifier le paiement"
                            className="btn-secondary py-1 px-2 text-xs text-primary"
                          >
                            <Edit size={13} /> Modif.
                          </button>
                          <button
                            onClick={() => setConfirmDelete(p)}
                            title="Supprimer / Annuler"
                            className="btn-secondary py-1 px-2 text-xs text-rose-500 hover:bg-rose-500/10"
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            onClick={() => { void (async () => { await printReceipt(p); await createNotification({ type: "print", title: "Reçu imprimé", message: `Reçu ${p.type}`, module: "perception", entityId: p.id }); })(); }}
                            className="btn-secondary py-1 px-2 text-xs"
                          >
                            <Printer size={13} /> Reçu
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Modal Edition Paiement */}
      {editingPayment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleSaveEdit} className="medical-card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Edit size={18} /> Modifier le paiement
              </h3>
              <button type="button" onClick={() => setEditingPayment(null)} className="text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-muted mb-4 font-semibold">
              Patient : {editingPayment.patients ? `${editingPayment.patients.prenom} ${editingPayment.patients.nom}` : "Inconnu"} ({editingPayment.patients?.numero_dossier})
            </p>

            <div className="space-y-4">
              <label className="block">
                <span className="label">Type de paiement / prestation *</span>
                <input
                  className="input-field"
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Montant ($) *</span>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={editForm.montant}
                    onChange={(e) => setEditForm({ ...editForm, montant: e.target.value })}
                    required
                  />
                </label>

                <label className="block">
                  <span className="label">Mode de paiement</span>
                  <select
                    className="input-field"
                    value={editForm.mode_paiement}
                    onChange={(e) => setEditForm({ ...editForm, mode_paiement: e.target.value as Payment["mode_paiement"] })}
                  >
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_TRANSFER">Virement bancaire</option>
                    <option value="INSURANCE">Assurance</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="label">Statut du paiement</span>
                <select
                  className="input-field"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Payment["status"] })}
                >
                  <option value="COMPLETED">Payé (Encaissé)</option>
                  <option value="PENDING">En attente</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </label>

              <label className="block">
                <span className="label">Notes / Remarques</span>
                <input
                  className="input-field"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Raison de la modification..."
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-border/50">
              <button type="button" className="btn-secondary" onClick={() => setEditingPayment(null)}>
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Sauvegarde..." : "Enregistrer les modifications"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Confirmation Suppression Paiement */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="medical-card w-full max-w-md p-6">
            <h3 className="font-bold flex items-center gap-2 text-rose-500 text-lg">
              <AlertTriangle /> Supprimer ou annuler ce paiement ?
            </h3>
            <p className="text-sm text-muted mt-2">
              Patient : <strong className="text-text">{confirmDelete.patients ? `${confirmDelete.patients.prenom} ${confirmDelete.patients.nom}` : "Inconnu"}</strong>
            </p>
            <p className="text-sm text-muted mt-1">
              Montant : <strong className="text-text">{formatMoney(confirmDelete.montant)}</strong> ({confirmDelete.type})
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button
                className="btn-primary bg-rose-500 hover:bg-rose-600 border-none"
                onClick={() => void handleDeletePayment()}
                disabled={saving}
              >
                {saving ? "Traitement..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
