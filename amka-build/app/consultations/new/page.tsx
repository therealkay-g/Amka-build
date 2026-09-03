"use client";

import { FormEvent, useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Stethoscope, FileText, Wallet } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { ConsultationClinicalForm } from "@/components/consultations/ConsultationClinicalForm";
import { ConsultationExamPrescription } from "@/components/consultations/ConsultationExamPrescription";
import { supabase } from "@/lib/supabase";
import { logAudit, logActivity, createNotification } from "@/lib/audit";
import { EMPTY_CLINICAL_DATA } from "@/lib/consultation-clinical";
import type { ConsultationClinicalData } from "@/lib/consultation-clinical";
import { DEFAULT_EXAM_CATALOG, toUuid } from "@/lib/exam-catalog";
import type { ExamCategoryWithExams, Exam } from "@/lib/exam-types";
import { fetchPatientsEligibleForConsultation, isPatientEligibleForConsultation } from "@/lib/patient-eligibility";
import { useRealtimeTables } from "@/lib/hooks/useRealtimeTable";
import type { Patient, Profile } from "@/lib/types";

function NewConsultationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledPatientId = searchParams.get("patientId");

  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medecins, setMedecins] = useState<Profile[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [motif, setMotif] = useState("");
  const [diagnostic, setDiagnostic] = useState("");
  const [traitement, setTraitement] = useState("");
  const [clinical, setClinical] = useState<ConsultationClinicalData>({ ...EMPTY_CLINICAL_DATA });
  const [medecinId, setMedecinId] = useState("");
  const [examCatalog, setExamCatalog] = useState<ExamCategoryWithExams[]>(DEFAULT_EXAM_CATALOG);
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());

  const searchEligible = useCallback(async (term?: string) => {
    setSearching(true);
    const list = await fetchPatientsEligibleForConsultation(term);
    setPatients(list);
    setSearching(false);
  }, []);

  useEffect(() => {
    async function init() {
      const [medecinResult, catResult, examResult] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("exam_categories").select("*").eq("is_active", true).order("display_order"),
        supabase.from("exams").select("*").eq("is_active", true).order("display_order"),
      ]);

      let docs = (medecinResult.data ?? []) as Profile[];
      if (docs.length === 0) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch("/api/users", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
              const apiUsers = await res.json();
              if (Array.isArray(apiUsers)) docs = apiUsers;
            }
          }
        } catch (e) {
          console.error("Erreur fallback fetch users:", e);
        }
      }

      const DOCTOR_ROLES = new Set([
        "MEDECIN_DIRECTEUR", "MEDECIN_1", "MEDECIN_2", "MEDECIN_3", "MEDECIN_4",
        "ORTHOPEDISTE", "PSYCHIATRE", "CHIRURGIEN", "RADIOLOGUE", "KINESITHERAPEUTE", "INFIRMIER", "ADMIN"
      ]);

      const filteredDocs = docs.filter(p => {
        if (p.is_active === false) return false;
        const r = (p.role || "").toUpperCase();
        return DOCTOR_ROLES.has(r) || r.includes("MEDECIN");
      });

      setMedecins(filteredDocs);

      console.log("[CATALOG] catResult:", catResult.data?.length, "examResult:", examResult.data?.length);
      if (catResult.error) console.error("[CATALOG] catError:", catResult.error);
      if (examResult.error) console.error("[CATALOG] examError:", examResult.error);

      if (catResult.data && examResult.data && catResult.data.length > 0) {
        const cats = catResult.data as ExamCategoryWithExams[];
        const exams = examResult.data as Exam[];
        console.log("[CATALOG] Using DB catalog, cats:", cats.length, "exams:", exams.length, "first exam id:", exams[0]?.id);
        const catalog = cats.map((c) => ({
          ...c,
          exams: exams.filter((ex) => ex.category_id === c.id),
        }));
        setExamCatalog(catalog);
      }

      if (prefilledPatientId) {
        const eligible = await isPatientEligibleForConsultation(prefilledPatientId);
        if (eligible) {
          const { data: p } = await supabase.from("patients").select("*").eq("id", prefilledPatientId).maybeSingle();
          if (p) setSelectedPatient(p as Patient);
        } else {
          setToast({
            tone: "info",
            message: "Ce bénéficiaire n'a pas de paiement consultation disponible. Enregistrez d'abord le paiement à la perception.",
          });
        }
      }
    }
    void init();
  }, [prefilledPatientId]);

  useEffect(() => {
    if (patientQuery.trim().length < 2) {
      setPatients([]);
      return;
    }
    const id = window.setTimeout(() => void searchEligible(patientQuery), 300);
    return () => window.clearTimeout(id);
  }, [patientQuery, searchEligible]);

  useRealtimeTables(["payments", "consultations"], () => {
    if (patientQuery.trim().length >= 2) void searchEligible(patientQuery);
    if (selectedPatient) {
      void isPatientEligibleForConsultation(selectedPatient.id).then((ok) => {
        if (!ok) {
          setSelectedPatient(null);
          setToast({
            tone: "info",
            message: "Le bénéficiaire sélectionné n'est plus éligible (paiement utilisé ou consultation en cours).",
          });
        }
      });
    }
  }, [patientQuery, selectedPatient?.id, searchEligible]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatient) {
      setToast({ tone: "error", message: "Veuillez sélectionner un bénéficiaire ayant payé la consultation." });
      return;
    }
    const eligible = await isPatientEligibleForConsultation(selectedPatient.id);
    if (!eligible) {
      setToast({ tone: "error", message: "Paiement consultation requis avant d'ouvrir une fiche." });
      return;
    }
    if (!medecinId) {
      setToast({ tone: "error", message: "Veuillez sélectionner un médecin." });
      return;
    }
    if (!motif.trim()) {
      setToast({ tone: "error", message: "Le motif de consultation est requis (section II)." });
      return;
    }

    setSaving(true);
    const g = clinical.examen_general;
    const { data, error } = await supabase.from("consultations").insert({
      patient_id: selectedPatient.id,
      medecin_id: medecinId,
      motif: motif.trim(),
      diagnostic: diagnostic.trim() || null,
      tension: g.ta || null,
      temperature: g.temperature ? Number(g.temperature) : null,
      poids: g.poids ? Number(g.poids) : null,
      traitement: traitement.trim() || null,
      notes: null,
      clinical_data: clinical,
      status: "EN_COURS",
    }).select("id").single();

    if (error) {
      setSaving(false);
      setToast({ tone: "error", message: error.message });
      return;
    }

    if (data?.id && selectedExamIds.size > 0) {
      const now = new Date().toISOString();
      console.log("[SAVE] selectedExamIds:", Array.from(selectedExamIds));
      const examRows = Array.from(selectedExamIds);
      const { data: dbExams } = await supabase.from("exams").select("id, name");
      const examNameToId = new Map((dbExams ?? []).map((e: { id: string; name: string }) => [e.name, e.id]));
      const examRowsToInsert = examRows.map((examId) => {
        const fallbackExam = DEFAULT_EXAM_CATALOG.flatMap(c => c.exams).find(e => e.id === examId);
        const realId = examNameToId.get(fallbackExam?.name ?? "") ?? toUuid(examId);
        return {
          consultation_id: data.id,
          exam_id: realId,
          status: "EN_ATTENTE_PAIEMENT",
          status_updated_at: now,
        };
      });
      const { error: examError } = await supabase.from("consultation_exams").insert(examRowsToInsert).select("id");
      if (examError) {
        console.error("Erreur enregistrement examens:", examError);
        setToast({ tone: "error", message: `Erreur lors de l'enregistrement des examens : ${examError.message}` });
      } else if (examRows.length > 0) {
        const { data: inserted } = await supabase.from("consultation_exams").select("id").eq("consultation_id", data.id);
        if (inserted) {
          await supabase.from("exam_status_history").insert(
            inserted.map((ce: { id: string }) => ({
              consultation_exam_id: ce.id,
              previous_status: null,
              new_status: "EN_ATTENTE_PAIEMENT",
              changed_by: medecinId,
            }))
          );
        }
      }
    }

    setSaving(false);

    await logAudit({ action: "CREATE", module: "consultations", entityId: data?.id, details: { patient_id: selectedPatient.id } });
    await logActivity({ action: "Consultation créée", module: "consultations", details: motif.slice(0, 80) });
    await createNotification({
      type: "consultation",
      title: "Nouvelle consultation",
      message: `Consultation pour ${selectedPatient.prenom} ${selectedPatient.nom} (${selectedPatient.numero_dossier})`,
      module: "consultations",
      entityId: data?.id,
    });
    setToast({ tone: "success", message: `Fiche clinique enregistrée pour ${selectedPatient.prenom} ${selectedPatient.nom}.` });
    setTimeout(() => router.push(data?.id ? `/consultations/${data.id}` : "/consultations"), 800);
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Consultation médicale</p>
        <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Fiche de consultation</h2>
        <p className="mt-1 text-muted text-sm">
          Seuls les bénéficiaires ayant payé les frais de consultation (perception) apparaissent ici — synchronisation en temps réel.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary" /> I. Bénéficiaire & médecin
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              {selectedPatient ? (
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <p className="font-bold text-lg">{selectedPatient.prenom} {selectedPatient.nom}</p>
                    <p className="text-sm text-muted">{selectedPatient.numero_dossier}</p>
                    <div className="mt-2"><Badge tone="success">Paiement consultation validé</Badge></div>
                  </div>
                  <button type="button" className="btn-secondary text-sm" onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}>
                    <X size={14} /> Changer
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 text-muted" size={18} />
                    <input
                      className="input-field pl-11"
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      placeholder="Rechercher un bénéficiaire (min. 2 caractères)..."
                    />
                    {searching && <p className="text-xs text-muted mt-1">Recherche...</p>}
                    {patients.length > 0 && (
                      <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-surface shadow-card overflow-hidden">
                        {patients.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            className="flex w-full justify-between px-4 py-3 hover:bg-surface-soft text-left"
                            onClick={() => { setSelectedPatient(patient); setPatients([]); setPatientQuery(""); }}
                          >
                            <span className="font-semibold">{patient.prenom} {patient.nom}</span>
                            <Badge tone="primary">{patient.numero_dossier}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                    {patientQuery.trim().length >= 2 && !searching && patients.length === 0 && (
                      <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
                        <p className="font-semibold text-text">Aucun bénéficiaire éligible</p>
                        <p className="text-muted mt-1">Le paiement « Consultation » doit être enregistré et validé à la perception.</p>
                        <Link href="/perception/new?type=Consultation" className="btn-primary inline-flex items-center gap-2 mt-3 text-xs">
                          <Wallet size={14} /> Enregistrer un paiement
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <label className="block lg:col-span-2">
              <span className="label">Médecin responsable *</span>
              <select className="input-field" value={medecinId} onChange={(e) => setMedecinId(e.target.value)} required>
                <option value="">— Sélectionner —</option>
                {medecins.map((m) => (
                  <option key={m.id} value={m.id}>Dr. {m.first_name} {m.last_name}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <ConsultationClinicalForm
          clinical={clinical}
          onChange={setClinical}
          motif={motif}
          onMotifChange={setMotif}
          diagnostic={diagnostic}
          onDiagnosticChange={setDiagnostic}
          traitement={traitement}
          onTraitementChange={setTraitement}
        />

        <ConsultationExamPrescription
          catalog={examCatalog}
          selectedExamIds={selectedExamIds}
          onSelectionChange={setSelectedExamIds}
        />

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.push("/consultations")}>Annuler</button>
          <button className="btn-primary flex items-center gap-2" type="submit" disabled={saving}>
            <Stethoscope size={16} /> {saving ? "Enregistrement..." : "Enregistrer la fiche"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

export default function NewConsultationPage() {
  return (
    <Suspense fallback={<AppShell><div className="skeleton h-32" /></AppShell>}>
      <NewConsultationForm />
    </Suspense>
  );
}
