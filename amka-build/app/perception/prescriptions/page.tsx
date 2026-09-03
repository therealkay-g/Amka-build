"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, DollarSign, Printer, FileText, User, Calendar,
  Stethoscope, Pill, Activity, HeartPulse, Brain, Building2, Bandage, Bone,
  Scissors, RefreshCw, Edit, Trash2
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate } from "@/lib/utils";
import { getPendingPrescriptionItems, createPrescriptionInvoice, validatePrescriptionPayment } from "@/lib/workflow/prescription-billing";
import { printInvoice } from "@/lib/export";
import { logAudit, createNotification } from "@/lib/audit";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { cn } from "@/lib/utils";
import { SERVICE_TYPE_ICONS, SERVICE_TYPE_LABELS } from "@/lib/workflow-types";

type PendingItem = {
  id: string;
  consultation_id: string;
  item_type: 'medical_act' | 'medication';
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  created_at: string;
  category: string;
  patients: { nom: string; prenom: string; numero_dossier: string; sexe: string; date_naissance: string } | null;
  consultations: {
    patient_id: string;
    medecin_id: string;
    date_consultation: string;
    profiles: { first_name: string; last_name: string; full_name?: string } | null;
  } | null;
};

const ITEM_ICONS: Record<string, React.ElementType> = {
  KINESITHERAPIE: Activity,
  ECG: HeartPulse,
  EEG: Brain,
  CHIRURGIE: Scissors,
  HOSPITALISATION: Building2,
  PANSEMENTS: Bandage,
  PLATRES: Bone,
};

export default function PerceptionPrescriptionsPage() {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
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
      const data = await getPendingPrescriptionItems();
      setPendingItems((data ?? []) as unknown as PendingItem[]);
    } catch {
      setToast({ tone: "error", message: "Erreur lors du chargement des prescriptions en attente" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeTable("prescribed_items", load);

  const grouped = pendingItems.reduce<Record<string, PendingItem[]>>((acc, item) => {
    const key = item.consultation_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  async function handleCreateInvoice(consultationId: string) {
    if (!profile) return;
    setProcessingId(consultationId);

    const items = grouped[consultationId];
    if (!items || items.length === 0) return;

    const patientId = items[0].consultations?.patient_id;
    const medecinId = items[0].consultations?.medecin_id;
    if (!patientId || !medecinId) {
      setToast({ tone: "error", message: "Données de consultation incomplètes" });
      setProcessingId(null);
      return;
    }

    const itemIds = items.map((i) => i.id);
    const result = await createPrescriptionInvoice({
      consultationId,
      patientId,
      medecinId,
      createdById: profile.id,
      itemIds,
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
      .from("prescription_bills")
      .select("id")
      .eq("consultation_id", consultationId)
      .eq("status", "PENDING");

    if (!invoices || invoices.length === 0) {
      setToast({ tone: "error", message: "Veuillez d'abord générer la facture pour cette consultation avant de valider le paiement." });
      setProcessingId(null);
      return;
    }

    const invoiceId = invoices[0].id;
    const consultation = grouped[consultationId][0]?.consultations;
    const patientId = consultation?.patient_id;

    if (!patientId) { setToast({ tone: "error", message: "Patient introuvable" }); setProcessingId(null); return; }

    const patient = grouped[consultationId][0]?.patients;
    const patientName = patient ? `${patient.prenom} ${patient.nom}` : "—";
    const totalAmount = customTotal !== "" ? (parseInt(customTotal) || 0) : grouped[consultationId].reduce((s, i) => s + i.total_price, 0);

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        patient_id: patientId,
        montant: totalAmount,
        type: "Prescriptions",
        mode_paiement: "CASH",
        status: "PENDING",
        service_id: consultationId,
        service_type: "prescriptions",
        notes: `Paiement prescriptions - ${patientName}`,
      })
      .select("id")
      .single();

    if (payError || !payment) {
      setToast({ tone: "error", message: "Erreur création paiement" });
      setProcessingId(null);
      return;
    }

    await validatePrescriptionPayment({
      invoiceId,
      consultationId,
      patientId,
      paymentId: payment.id,
    });

    await supabase.from("payments").update({ status: "COMPLETED" }).eq("id", payment.id);

    await createNotification({
      type: "payment",
      title: "Paiement prescriptions validé",
      message: `Patient: ${patientName}`,
      module: "perception",
      entityId: consultationId,
    });

    setProcessingId(null);
    setSelectedConsultation(null);
    setCustomTotal("");
    setToast({ tone: "success", message: "Paiement validé. Les services et la pharmacie ont été notifiés." });
    void load();
  }

  async function handleDeletePrescriptionItem(itemId: string) {
    if (!confirm("Êtes-vous sûr de vouloir retirer cet élément de la prescription ?")) return;
    const { error } = await supabase
      .from("prescribed_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      const { error: updErr } = await supabase
        .from("prescribed_items")
        .update({ status: "ANNULE" })
        .eq("id", itemId);
      if (updErr) {
        setToast({ tone: "error", message: updErr.message });
        return;
      }
    }
    await logAudit({ action: "DELETE_PRESCRIPTION_ITEM", module: "perception", entityId: itemId });
    setToast({ tone: "success", message: "Élément retiré avec succès." });
    void load();
  }

  async function handleEditPrescriptionItem(item: PendingItem) {
    const newQtyStr = prompt("Nouvelle quantité :", String(item.quantity));
    if (newQtyStr === null) return;
    const newQty = parseInt(newQtyStr) || 1;

    const newUnitPriceStr = prompt("Nouveau prix unitaire ($) :", String(item.unit_price));
    if (newUnitPriceStr === null) return;
    const newUnitPrice = parseFloat(newUnitPriceStr) || 0;

    const newTotalPrice = newQty * newUnitPrice;

    const { error } = await supabase
      .from("prescribed_items")
      .update({
        quantity: newQty,
        unit_price: newUnitPrice,
        total_price: newTotalPrice
      })
      .eq("id", item.id);

    if (error) {
      setToast({ tone: "error", message: error.message });
    } else {
      await logAudit({ action: "EDIT_PRESCRIPTION_ITEM", module: "perception", entityId: item.id, details: { newQty, newUnitPrice, newTotalPrice } });
      setToast({ tone: "success", message: "Prescription modifiée avec succès." });
      void load();
    }
  }

  function getTotalForConsultation(consultationId: string): number {
    if (customTotal !== "") return parseInt(customTotal) || 0;
    return grouped[consultationId].reduce((sum, i) => sum + i.total_price, 0);
  }

  return (
    <AppShell>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <Link href="/perception" className="flex items-center gap-1 text-sm text-muted hover:text-primary mb-3"><ArrowLeft size={15} /> Perception</Link>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Facturation</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Prescriptions à facturer</h2>
          <p className="mt-1 text-muted text-sm">Actes et médicaments en attente de paiement — {pendingItems.length} item(s)</p>
        </div>
        <button onClick={() => void load()} className="btn-secondary"><RefreshCw size={16} /></button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}</div>
        ) : Object.keys(grouped).length === 0 ? (
          <section className="medical-card p-12 text-center">
            <DollarSign size={48} className="mx-auto text-muted mb-4" />
            <p className="text-lg font-bold text-text">Aucune prescription en attente</p>
            <p className="text-sm text-muted mt-1">Les prescriptions apparaîtront ici après la consultation.</p>
            <Link href="/consultations" className="btn-primary mt-4 inline-flex items-center gap-2"><Stethoscope size={16} /> Consultations</Link>
          </section>
        ) : (
          Object.entries(grouped).map(([consultationId, items]) => {
            const c = items[0]?.consultations;
            const patient = items[0]?.patients;
            const medecin = c?.profiles;
            const total = getTotalForConsultation(consultationId);
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
                        {items.map((item, idx) => {
                          const type = item.item_type === 'medical_act' ? 'act' : 'med';
                          return <Badge key={idx} tone={type === 'act' ? 'warning' : 'primary'} className="text-[10px]">{type === 'act' ? 'Acte' : 'Médic.'}</Badge>;
                        })}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4 animate-slide-up">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">Items prescrits</p>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-surface-soft px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const Icon = item.item_type === 'medication' ? Pill : (ITEM_ICONS[item.category] || Activity);
                                return <Icon size={15} className="text-primary" />;
                              })()}
                              <span className="text-sm font-semibold">{item.item_name}</span>
                              {item.quantity > 1 && <span className="text-xs text-muted">x{item.quantity}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-text">{formatMoney(item.total_price)}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleEditPrescriptionItem(item);
                                }}
                                title="Modifier la quantité / prix"
                                className="btn-secondary py-1 px-2 text-xs text-primary flex items-center gap-1"
                              >
                                <Edit size={13} /> Modif.
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeletePrescriptionItem(item.id);
                                }}
                                title="Retirer de la prescription"
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
                            placeholder={String(grouped[consultationId]?.reduce((s, i) => s + i.total_price, 0) ?? 0)}
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
                                name: i.item_name,
                                category: i.item_type === 'medical_act' ? 'Acte' : 'Médicament',
                                price: i.unit_price,
                                quantity: i.quantity
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
