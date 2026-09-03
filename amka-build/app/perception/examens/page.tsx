"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, DollarSign, Printer, CreditCard, Search, RefreshCw,
  FileText, User, Calendar, Stethoscope, FlaskConical, Activity, HeartPulse,
  Brain, Edit, Trash2
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate } from "@/lib/utils";
import { getPendingBillingExams, createExamInvoice, onPaymentValidated } from "@/lib/exam-workflow";
import { printInvoice } from "@/lib/export";
import { logAudit, createNotification } from "@/lib/audit";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { cn } from "@/lib/utils";

type PendingExam = {
  id: string;
  consultation_id: string;
  exam_id: string;
  status: string;
  created_at: string;
  consultations: {
    patient_id: string;
    motif: string;
    medecin_id: string;
    date_consultation: string;
    patients: { nom: string; prenom: string; numero_dossier: string; sexe: string; date_naissance: string } | null;
    profiles: { first_name: string; last_name: string } | null;
  } | null;
  exams: { name: string; price: number; exam_categories: { name: string } } | null;
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Bacteriologie: FlaskConical,
  Hematologie: Activity,
  Biochimie: HeartPulse,
  Parasitologie: Brain,
};

export default function PerceptionExamensPage() {
  const [pendingExams, setPendingExams] = useState<PendingExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
  const [customTotal, setCustomTotal] = useState<string>("");
  const [profile, setProfile] = useState<{ id: string } | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setProfile({ id: user.id });
    }
    void loadUser();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingBillingExams();
      setPendingExams((data ?? []) as unknown as PendingExam[]);
    } catch {
      setToast({ tone: "error", message: "Erreur lors du chargement des examens en attente" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeTable("consultation_exams", load);

  const grouped = pendingExams.reduce<Record<string, PendingExam[]>>((acc, item) => {
    const key = item.consultation_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  async function handleCreateInvoice(consultationId: string) {
    if (!profile) return;
    setProcessingId(consultationId);

    const examIds = grouped[consultationId].map((e) => e.id);
    const consultation = grouped[consultationId][0]?.consultations;
    const patientId = consultation?.patient_id;
    const medecinId = consultation?.medecin_id;

    if (!patientId) {
      setToast({ tone: "error", message: "Patient introuvable" });
      setProcessingId(null);
      return;
    }

    const result = await createExamInvoice({
      consultationId,
      patientId,
      medecinId,
      createdById: profile.id,
      consultationExamIds: examIds,
      customTotal: customTotal !== "" ? (parseInt(customTotal) || 0) : undefined,
    });

    if (result.error) {
      setToast({ tone: "error", message: result.error });
      setProcessingId(null);
      return;
    }

    await logAudit({ action: "INVOICE_CREATED", module: "perception", entityId: result.invoiceId, details: { consultationId } });
    setProcessingId(null);
    setSelectedConsultation(consultationId);
    setToast({ tone: "success", message: `Facture ${result.invoiceNumber} créée.` });
    void load();
  }

  async function handleMarkPaid(consultationId: string) {
    if (!profile) return;
    setProcessingId(`paid-${consultationId}`);

    let { data: invoices } = await supabase
      .from("invoices")
      .select("id")
      .eq("consultation_id", consultationId)
      .eq("status", "EN_ATTENTE");

    if (!invoices || invoices.length === 0) {
      const examIds = grouped[consultationId].map((e) => e.id);
      const consultation = grouped[consultationId][0]?.consultations;
      const patientId = consultation?.patient_id;
      const medecinId = consultation?.medecin_id;
      if (!patientId) {
        setToast({ tone: "error", message: "Patient introuvable" });
        setProcessingId(null);
        return;
      }
      const result = await createExamInvoice({
        consultationId,
        patientId,
        medecinId,
        createdById: profile.id,
        consultationExamIds: examIds,
        customTotal: customTotal !== "" ? (parseInt(customTotal) || 0) : undefined,
      });
      if (result.error) {
        setToast({ tone: "error", message: result.error });
        setProcessingId(null);
        return;
      }
      setToast({ tone: "success", message: `Facture ${result.invoiceNumber} créée.` });
      invoices = [{ id: result.invoiceId! }];
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("id, nom, prenom, numero_dossier")
      .eq("id", grouped[consultationId][0]?.consultations?.patient_id ?? "")
      .maybeSingle();
    const patientName = patient ? `${patient.prenom} ${patient.nom}` : "—";
    const totalAmount = customTotal !== "" ? (parseInt(customTotal) || 0) : grouped[consultationId].reduce((s, e) => s + (e.exams?.price ?? 0), 0);

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        patient_id: grouped[consultationId][0]?.consultations?.patient_id,
        montant: totalAmount,
        type: "Examens",
        mode_paiement: "CASH",
        status: "PENDING",
        service_id: consultationId,
        service_type: "examens",
        notes: `Paiement examens - ${patientName}`,
      })
      .select("id")
      .single();

    if (payError || !payment) {
      setToast({ tone: "error", message: "Erreur création paiement" });
      setProcessingId(null);
      return;
    }

    try {
      await Promise.all(
        invoices.map((inv: { id: string }) =>
          onPaymentValidated({ invoiceId: inv.id, consultationId, patientId: grouped[consultationId][0]?.consultations?.patient_id ?? "" })
        )
      );
    } catch {
      setToast({ tone: "error", message: "Erreur lors de la validation. Contactez le support." });
      setProcessingId(null);
      return;
    }

    await supabase.from("payments").update({ status: "COMPLETED" }).eq("id", payment.id);

    await createNotification({
      type: "payment",
      title: "Paiement examens validé",
      message: `Patient: ${patientName}`,
      module: "perception",
      entityId: consultationId,
    });

    setProcessingId(null);
    setToast({ tone: "success", message: "Paiement validé. Les services ont été notifiés." });
    void load();
  }

  async function handleDeleteExamItem(consultationExamId: string) {
    if (!confirm("Êtes-vous sûr de vouloir retirer cet examen de la facturation ?")) return;
    const { error } = await supabase
      .from("consultation_exams")
      .delete()
      .eq("id", consultationExamId);

    if (error) {
      const { error: updErr } = await supabase
        .from("consultation_exams")
        .update({ status: "ANNULE" })
        .eq("id", consultationExamId);
      if (updErr) {
        setToast({ tone: "error", message: updErr.message });
        return;
      }
    }
    await logAudit({ action: "DELETE_EXAM_BILLING", module: "perception", entityId: consultationExamId });
    setToast({ tone: "success", message: "Examen retiré avec succès." });
    void load();
  }

  async function handleEditExamPrice(examId: string, currentPrice: number) {
    const newPriceStr = prompt("Nouveau tarif pour cet examen ($) :", String(currentPrice));
    if (newPriceStr === null) return;
    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) {
      setToast({ tone: "error", message: "Prix invalide." });
      return;
    }
    const { error } = await supabase
      .from("exams")
      .update({ price: newPrice })
      .eq("id", examId);

    if (error) {
      setToast({ tone: "error", message: error.message });
    } else {
      await logAudit({ action: "EDIT_EXAM_PRICE", module: "perception", entityId: examId, details: { newPrice } });
      setToast({ tone: "success", message: "Tarif mis à jour." });
      void load();
    }
  }

  function getTotalForConsultation(consultationId: string): number {
    if (customTotal !== "") return parseInt(customTotal) || 0;
    return grouped[consultationId].reduce((sum, e) => sum + (e.exams?.price ?? 0), 0);
  }

  function getCategoriesForConsultation(consultationId: string): string[] {
    const cats = new Set<string>();
    for (const e of grouped[consultationId]) {
      if (e.exams?.exam_categories?.name) cats.add(e.exams.exam_categories.name);
    }
    return Array.from(cats);
  }

  return (
    <AppShell>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <Link href="/perception" className="flex items-center gap-1 text-sm text-muted hover:text-primary mb-3"><ArrowLeft size={15} /> Perception</Link>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Facturation</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Examens à facturer</h2>
          <p className="mt-1 text-muted text-sm">Prescriptions en attente de paiement — {pendingExams.length} examen(s)</p>
        </div>
        <button onClick={() => void load()} className="btn-secondary"><RefreshCw size={16} /></button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}</div>
        ) : Object.keys(grouped).length === 0 ? (
          <section className="medical-card p-12 text-center">
            <DollarSign size={48} className="mx-auto text-muted mb-4" />
            <p className="text-lg font-bold text-text">Aucun examen en attente</p>
            <p className="text-sm text-muted mt-1">Les examens prescrits apparaîtront ici après la consultation.</p>
            <Link href="/consultations" className="btn-primary mt-4 inline-flex items-center gap-2"><Stethoscope size={16} /> Consultations</Link>
          </section>
        ) : (
          Object.entries(grouped).map(([consultationId, items]) => {
            const c = items[0]?.consultations;
            const patient = c?.patients;
            const medecin = c?.profiles;
            const total = getTotalForConsultation(consultationId);
            const categories = getCategoriesForConsultation(consultationId);
            const isSelected = selectedConsultation === consultationId;

            return (
              <section
                key={consultationId}
                className={cn("medical-card overflow-hidden transition-all cursor-pointer", isSelected && "ring-2 ring-primary")}
                onClick={() => setSelectedConsultation(isSelected ? null : consultationId)}
              >
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <User size={22} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-text">{patient ? `${patient.prenom} ${patient.nom}` : "—"}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge tone="primary">{patient?.numero_dossier ?? "—"}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                          <Stethoscope size={13} /> Dr. {medecin?.last_name ?? "—"}
                          <Calendar size={13} className="ml-2" /> {c?.date_consultation ? formatDate(c.date_consultation) : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-primary">{formatMoney(total)}</p>
                      <div className="flex gap-1 mt-2 justify-end">
                        {categories.map((cat) => {
                          const Icon = CATEGORY_ICONS[cat] || FileText;
                          return <Badge key={cat} tone="warning" className="flex items-center gap-1"><Icon size={11} /> {cat}</Badge>;
                        })}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4 animate-slide-up">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">Examens prescrits</p>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-surface-soft px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {item.exams?.exam_categories?.name && (() => {
                                const Icon = CATEGORY_ICONS[item.exams.exam_categories.name] || FileText;
                                return <Icon size={15} className="text-primary" />;
                              })()}
                              <span className="text-sm font-semibold">{item.exams?.name ?? "—"}</span>
                              <span className="text-xs font-bold text-primary ml-2">({formatMoney(item.exams?.price ?? 0)})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted">{item.exams?.exam_categories?.name}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.exam_id) void handleEditExamPrice(item.exam_id, item.exams?.price ?? 0);
                                }}
                                title="Modifier le prix"
                                className="btn-secondary py-1 px-2 text-xs text-primary flex items-center gap-1"
                              >
                                <Edit size={13} /> Prix
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteExamItem(item.id);
                                }}
                                title="Retirer cet examen"
                                className="btn-secondary py-1 px-2 text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-1"
                              >
                                <Trash2 size={13} /> Retirer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3 border border-primary/20">
                        <p className="font-bold text-text">Total</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="input-field w-32 text-right text-lg font-black"
                            placeholder={String(grouped[consultationId]?.reduce((s, e) => s + (e.exams?.price ?? 0), 0) ?? 0)}
                            value={customTotal}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setCustomTotal(e.target.value)}
                          />
                          <span className="text-sm font-bold text-muted">CDF</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleCreateInvoice(consultationId); }}
                          disabled={processingId === consultationId}
                          className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                          <FileText size={16} />
                          {processingId === consultationId ? "Création..." : "Générer la facture"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleMarkPaid(consultationId); }}
                          disabled={processingId === `paid-${consultationId}`}
                          className="btn-primary flex-1 flex items-center justify-center gap-2"
                          style={{ background: "var(--success)" }}
                        >
                          <CheckCircle size={16} />
                          {processingId === `paid-${consultationId}` ? "Traitement..." : "Valider le paiement"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            printInvoice({
                              invoiceNumber: "PROFORMA",
                              patientName: patient ? `${patient.prenom} ${patient.nom}` : "—",
                              patientDossier: patient?.numero_dossier ?? "—",
                              doctorName: `Dr. ${medecin?.last_name ?? "—"}`,
                              date: c?.date_consultation ? formatDate(c.date_consultation) : "—",
                              items: items.map((i) => ({
                                name: i.exams?.name ?? "—",
                                category: i.exams?.exam_categories?.name ?? "—",
                                price: i.exams?.price ?? 0,
                              })),
                              total: customTotal !== "" ? (parseInt(customTotal) || 0) : total,
                              status: "EN_ATTENTE",
                            });
                          }}
                          className="btn-secondary flex items-center justify-center gap-2"
                        >
                          <Printer size={16} /> Aperçu
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
