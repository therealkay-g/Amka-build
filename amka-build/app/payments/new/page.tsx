"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, DollarSign, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { logAudit, createNotification, logActivity } from "@/lib/audit";
import { processPaymentCompleted } from "@/lib/payment-sync";
import type { Patient } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

const PAYMENT_TYPES = [
  "Consultation",
  "Kinésithérapie",
  "Laboratoire",
  "EG",
  "ECG",
  "Radiologie",
  "Chirurgie",
  "Hospitalisation",
  "Pharmacie",
  "Pansement",
  "Plâtre",
  "Soins infirmiers",
  "Forfait réadaptation",
  "Autres soins",
];

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<AppShell><div className="skeleton h-32" /></AppShell>}>
      <NewPaymentForm />
    </Suspense>
  );
}

function NewPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");
  const preselectedType = searchParams.get("type");
  const preselectedServiceId = searchParams.get("serviceId");
  const preselectedServiceType = searchParams.get("serviceType");

  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: "Consultation",
    customType: "",
    montant: "",
    mode_paiement: "CASH" as "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "INSURANCE",
    notes: "",
  });

  useEffect(() => {
    async function loadPreselected() {
      if (!preselectedPatientId) return;
      const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("id", preselectedPatientId)
        .eq("is_active", true)
        .maybeSingle();
      if (data) setSelectedPatient(data as Patient);
    }
    void loadPreselected();
  }, [preselectedPatientId]);

  useEffect(() => {
    if (preselectedType) {
      setForm((prev) => ({ ...prev, type: preselectedType }));
    }
  }, [preselectedType]);

  useEffect(() => {
    async function search() {
      if (patientQuery.trim().length < 2) { setPatients([]); return; }
      const term = `%${patientQuery.trim()}%`;
      const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("is_active", true)
        .or(`nom.ilike.${term},prenom.ilike.${term},numero_dossier.ilike.${term}`)
        .limit(8);
      setPatients((data ?? []) as Patient[]);
    }
    const id = window.setTimeout(() => void search(), 300);
    return () => window.clearTimeout(id);
  }, [patientQuery]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPatient) {
      setToast({ tone: "error", message: "Veuillez sélectionner un patient." });
      return;
    }
    const montant = parseFloat(form.montant);
    if (!montant || montant <= 0) {
      setToast({ tone: "error", message: "Le montant doit être supérieur à 0." });
      return;
    }

    setSaving(true);
    const { data: profile } = await supabase.auth.getUser();
    const paymentType = form.type === "Autres soins" && form.customType ? form.customType : form.type;
    const { data: payment, error } = await supabase.from("payments").insert({
      patient_id: selectedPatient.id,
      collected_by: profile.user?.id ?? null,
      montant,
      type: paymentType,
      mode_paiement: form.mode_paiement,
      status: "COMPLETED",
      notes: form.notes || null,
      service_id: preselectedServiceId || null,
      service_type: preselectedServiceType || null,
    }).select("id").single();
    setSaving(false);

    if (error) {
      setToast({ tone: "error", message: error.message });
      return;
    }

    await logAudit({ action: "CREATE", module: "perception", entityType: "payments", entityId: payment?.id, details: { montant, type: paymentType, patient_id: selectedPatient.id } });
    await logActivity({ action: "Paiement enregistré", module: "perception", details: `${formatMoney(montant)} — ${paymentType}` });
    await createNotification({ type: "payment", title: "Paiement perçu", message: `${formatMoney(montant)} pour ${paymentType}`, module: "perception", entityId: payment?.id });

    if (payment?.id) {
      await processPaymentCompleted({
        paymentId: payment.id,
        patientId: selectedPatient.id,
        montant,
        type: paymentType,
      });
    }
    setToast({ tone: "success", message: `Paiement de ${formatMoney(montant)} enregistré avec succès.` });
    const returnPath = window.location.pathname.startsWith("/perception") ? "/perception" : "/payments";
    setTimeout(() => router.push(returnPath), 900);
  }

  const modeOptions = [
    { value: "CASH", label: "💵 Cash" },
    { value: "MOBILE_MONEY", label: "📱 Mobile Money" },
    { value: "BANK_TRANSFER", label: "🏦 Virement Bancaire" },
    { value: "INSURANCE", label: "🛡️ Assurance" },
  ] as const;

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Finance</p>
        <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Nouveau Paiement</h2>
        <p className="mt-1 text-muted text-sm">Enregistrez un encaissement pour un patient.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient selection */}
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary" /> Patient
          </h3>

          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div>
                <p className="font-bold text-text text-lg">{selectedPatient.prenom} {selectedPatient.nom}</p>
                <p className="text-sm text-muted mt-0.5">{selectedPatient.numero_dossier}</p>
              </div>
              <button
                type="button"
                className="btn-secondary flex items-center gap-1 text-sm"
                onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
              >
                <X size={14} /> Changer
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 text-muted" size={18} />
              <input
                className="input-field pl-11"
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder="Rechercher un patient par nom ou dossier..."
                autoFocus
              />
              {patients.length > 0 && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-card">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-surface-soft transition-colors border-b border-border/50 last:border-0"
                      onClick={() => { setSelectedPatient(p); setPatients([]); setPatientQuery(""); }}
                    >
                      <div>
                        <p className="font-semibold text-text">{p.prenom} {p.nom}</p>
                        <p className="text-xs text-muted mt-0.5">{p.telephone ?? "Tél. non renseigné"}</p>
                      </div>
                      <Badge tone="primary">{p.numero_dossier}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Payment Details */}
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-primary" /> Détails du Paiement
          </h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="label">Type de Paiement</span>
              <select
                className="input-field"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            {form.type === "Autres soins" && (
              <label className="block">
                <span className="label">Précisez le type</span>
                <input
                  className="input-field"
                  value={form.customType}
                  onChange={(e) => setForm({ ...form, customType: e.target.value })}
                  placeholder="Ex: Bilan complet, Échographie..."
                />
              </label>
            )}

            <label className="block">
              <span className="label">Montant *</span>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-muted font-bold text-xs">FC</span>
                <input
                  className="input-field pl-10"
                  type="number"
                  min="0"
                  step="1"
                  value={form.montant}
                  onChange={(e) => setForm({ ...form, montant: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="label">Mode de Paiement</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {modeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, mode_paiement: opt.value })}
                    className={`rounded-xl border-2 p-3 text-sm font-bold transition-all text-left ${
                      form.mode_paiement === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text hover:border-primary/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="block lg:col-span-2">
              <span className="label">Notes (optionnel)</span>
              <textarea
                className="input-field min-h-20"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Remise accordée, référence d'assurance, numéro de transaction..."
              />
            </label>
          </div>

          {/* Total preview */}
          {parseFloat(form.montant) > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
              <span className="font-bold text-text">Total à encaisser</span>
              <span className="text-2xl font-black text-primary">{formatMoney(parseFloat(form.montant))}</span>
            </div>
          )}
        </section>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.push(window.location.pathname.startsWith("/perception") ? "/perception" : "/perception")}>
            Annuler
          </button>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer le Paiement"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
