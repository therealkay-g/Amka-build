"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Stethoscope, Pencil, Save, X, CheckCircle, CreditCard, FileText, Image, Download, Eye } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { ConsultationClinicalForm } from "@/components/consultations/ConsultationClinicalForm";
import { ConsultationWorkflowPrescription } from "@/components/consultations/ConsultationWorkflowPrescription";
import { ConsultationExamPrescription, ExamDisplay, buildExamPrintHtml } from "@/components/consultations/ConsultationExamPrescription";
import { saveConsultationPrescriptions, getConsultationPrescriptions } from "@/lib/workflow/prescription-service";
import { supabase } from "@/lib/supabase";
import { logAudit, logActivity } from "@/lib/audit";
import { mergeClinicalData } from "@/lib/consultation-clinical";
import type { ConsultationClinicalData } from "@/lib/consultation-clinical";
import { DEFAULT_EXAM_CATALOG, toUuid } from "@/lib/exam-catalog";
import type { ExamCategoryWithExams, Exam } from "@/lib/exam-types";
import type { FileAttachment } from "@/lib/file-types";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { canEdit } from "@/lib/permissions";
import type { Consultation, Profile, Payment } from "@/lib/types";
import { consultationLabel, formatDate, formatTime, formatMoney } from "@/lib/utils";
import { printHtml, printLetterhead, printOrdonnance } from "@/lib/export";

const STATUS_COLORS: Record<Consultation["status"], "warning" | "primary" | "success" | "error"> = {
  EN_ATTENTE: "warning", EN_COURS: "primary", TERMINEE: "success", ANNULEE: "error",
};



export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [clinical, setClinical] = useState<ConsultationClinicalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [motif, setMotif] = useState("");
  const [diagnostic, setDiagnostic] = useState("");
  const [traitement, setTraitement] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [examCatalog, setExamCatalog] = useState<ExamCategoryWithExams[]>(DEFAULT_EXAM_CATALOG);
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());
  const [examStatuses, setExamStatuses] = useState<Record<string, string>>({});
  const [resultFiles, setResultFiles] = useState<FileAttachment[]>([]);
  const [examResults, setExamResults] = useState<Record<string, { results: Record<string, unknown>; examName: string }>>({});
  const [workflowItems, setWorkflowItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: authUser }, { data, error }, { data: paymentsData }, catResult, examResult, consultExamResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("consultations").select(
        "*, patients(nom, prenom, numero_dossier, telephone, type_handicap, niveau_autonomie), profiles(first_name, last_name, email)"
      ).eq("id", params.id).maybeSingle(),
      supabase.from("payments").select("*").or(`service_id.eq.${params.id},type.ilike.Consultation`).order("created_at", { ascending: false }),
      supabase.from("exam_categories").select("*").eq("is_active", true).order("display_order"),
      supabase.from("exams").select("*").eq("is_active", true).order("display_order"),
      supabase.from("consultation_exams").select("exam_id").eq("consultation_id", params.id),
    ]);

    if (authUser.user) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", authUser.user.id).maybeSingle();
      setProfile(prof as Profile | null);
    }

    if (error) setToast({ tone: "error", message: error.message });
    const c = data as Consultation | null;
    setConsultation(c);
    const merged = c ? mergeClinicalData(c.clinical_data, { tension: c.tension, temperature: c.temperature, poids: c.poids }) : null;
    setClinical(merged);
    if (c) {
      setMotif(c.motif);
      setDiagnostic(c.diagnostic ?? "");
      setTraitement(c.traitement ?? "");
    }
    setPayments((paymentsData || []) as Payment[]);

    if (catResult.data && examResult.data && catResult.data.length > 0) {
      const cats = catResult.data as ExamCategoryWithExams[];
      const exams = examResult.data as Exam[];
      console.log("[DETAIL CATALOG] cats:", cats.length, "exams:", exams.length, "first:", exams[0]?.id);
      const catalog = cats.map((cc) => ({
        ...cc,
        exams: exams.filter((ex) => ex.category_id === cc.id),
      }));
      setExamCatalog(catalog);
    }

    if (consultExamResult.data) {
      const ids = new Set<string>(consultExamResult.data.map((ce: { exam_id: string }) => ce.exam_id));
      setSelectedExamIds(ids);
      setOriginalExamIds(ids);
    }

    const { data: statusData } = await supabase
      .from("consultation_exams")
      .select("exam_id, status")
      .eq("consultation_id", params.id);
    if (statusData) {
      const statusMap: Record<string, string> = {};
      for (const s of statusData as { exam_id: string; status: string }[]) {
        statusMap[s.exam_id] = s.status;
      }
      setExamStatuses(statusMap);
    }

    const { data: ceData } = await supabase
      .from("consultation_exams")
      .select("id, exam_id, results, exams(name)")
      .eq("consultation_id", params.id)
      .not("results", "is", null);
    if (ceData) {
      const map: Record<string, { results: Record<string, unknown>; examName: string }> = {};
      for (const ce of ceData as { exam_id: string; results: Record<string, unknown>; exams: { name: string } }[]) {
        map[ce.exam_id] = { results: ce.results, examName: ce.exams.name };
      }
      setExamResults(map);
    }

    if (c?.patient_id) {
      const examTables = ["laboratory_exams", "ecg_exams", "radiology_exams", "eg_exams"];
      const allFiles: FileAttachment[] = [];
      for (const table of examTables) {
        const { data: ids } = await supabase.from(table).select("id").eq("patient_id", c.patient_id);
        if (ids && ids.length > 0) {
          const idList = ids.map((x: { id: string }) => x.id);
          const { data: files } = await supabase.from("file_attachments").select("*").eq("entity_type", table).in("entity_id", idList);
          if (files) allFiles.push(...(files as FileAttachment[]));
        }
      }
      const { data: patientFiles } = await supabase.from("file_attachments").select("*").eq("entity_type", "patients").eq("entity_id", c.patient_id).order("created_at", { ascending: false });
      if (patientFiles) allFiles.push(...(patientFiles as FileAttachment[]));
      setResultFiles(allFiles);
    }

    const { data: prescrData } = await supabase.from("prescribed_items").select("*").eq("consultation_id", params.id);
    if (prescrData) setWorkflowItems(prescrData as any[]);

    setLoading(false);
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeTable("consultations", () => void load(), [load]);
  useRealtimeTable("payments", () => void load(), [load]);

  useEffect(() => {
    const channel = supabase.channel("ce-status-" + params.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_exams", filter: `consultation_id=eq.${params.id}` },
        () => { void load(); }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [params.id, load]);

  const [originalExamIds, setOriginalExamIds] = useState<Set<string>>(new Set());

  const editable = profile ? canEdit(profile.role, "consultations") : false;

  async function updateStatus(status: Consultation["status"]) {
    if (!consultation) return;
    setUpdatingStatus(true);
    const { error } = await supabase.from("consultations").update({ status }).eq("id", params.id);
    setUpdatingStatus(false);
    if (error) setToast({ tone: "error", message: error.message });
    else {
      setConsultation({ ...consultation, status });
      setToast({ tone: "success", message: `Statut : ${consultationLabel(status)}` });
    }
  }

  function cancelEdit() {
    if (!consultation) return;
    setClinical(mergeClinicalData(consultation.clinical_data, {
      tension: consultation.tension,
      temperature: consultation.temperature,
      poids: consultation.poids,
    }));
    setMotif(consultation.motif);
    setDiagnostic(consultation.diagnostic ?? "");
    setTraitement(consultation.traitement ?? "");
    setSelectedExamIds(new Set(originalExamIds));
    setEditing(false);
  }

  async function saveEdit() {
    if (!consultation || !clinical) return;
    setSaving(true);
    const g = clinical.examen_general;
    const { error } = await supabase.from("consultations").update({
      motif: motif.trim(),
      diagnostic: diagnostic.trim() || null,
      traitement: traitement.trim() || null,
      tension: g.ta || null,
      temperature: g.temperature ? Number(g.temperature) : null,
      poids: g.poids ? Number(g.poids) : null,
      clinical_data: clinical,
    }).eq("id", params.id);

    if (error) {
      setSaving(false);
      setToast({ tone: "error", message: error.message });
      return;
    }

    const currentIds = Array.from(selectedExamIds);
    const origIds = Array.from(originalExamIds);
    const toAdd = currentIds.filter((id) => !originalExamIds.has(id));
    const toRemove = origIds.filter((id) => !selectedExamIds.has(id));

    if (toAdd.length > 0) {
      const { data: dbExams } = await supabase.from("exams").select("id, name");
      const nameToId = new Map((dbExams ?? []).map((e: { id: string; name: string }) => [e.name, e.id]));
      const { data: inserted, error: addError } = await supabase.from("consultation_exams").insert(
        toAdd.map((examId) => {
          const exam = examCatalog.flatMap(c => c.exams).find(e => e.id === examId);
          const realId = nameToId.get(exam?.name ?? "") ?? toUuid(examId);
          return {
            consultation_id: params.id,
            exam_id: realId,
            status: "EN_ATTENTE_PAIEMENT",
            status_updated_at: new Date().toISOString(),
          };
        })
      ).select("id");

      if (addError) {
        setSaving(false);
        setToast({ tone: "error", message: `Erreur ajout examens : ${addError.message}` });
        return;
      }

      if (inserted) {
        await supabase.from("exam_status_history").insert(
          inserted.map((ce: { id: string }) => ({
            consultation_exam_id: ce.id,
            previous_status: null,
            new_status: "EN_ATTENTE_PAIEMENT",
            changed_by: profile?.id,
          }))
        );
      }
    }
    if (toRemove.length > 0) {
      await supabase.from("consultation_exams").delete()
        .eq("consultation_id", params.id)
        .in("exam_id", toRemove);
    }

    setSaving(false);
    await logAudit({ action: "UPDATE", module: "consultations", entityId: params.id });
    await logActivity({ action: "Consultation modifiée", module: "consultations", details: motif.slice(0, 80) });
    setConsultation({
      ...consultation,
      motif: motif.trim(),
      diagnostic: diagnostic.trim() || null,
      traitement: traitement.trim() || null,
      tension: g.ta || null,
      temperature: g.temperature ? Number(g.temperature) : null,
      poids: g.poids ? Number(g.poids) : null,
      clinical_data: clinical,
    });
    setOriginalExamIds(new Set(selectedExamIds));
    setEditing(false);
    setToast({ tone: "success", message: "Fiche mise à jour." });
  }

  async function saveWorkflowPrescriptions(items: any[]) {
    if (!consultation || !profile) return;
    setSaving(true);
    const res = await saveConsultationPrescriptions(
      params.id,
      consultation.patient_id,
      profile.id,
      items
    );
    setSaving(false);
    if (res.success) {
      setWorkflowItems(res.data || []);
      setToast({ tone: "success", message: "Prescriptions enregistrées." });
    } else {
      setToast({ tone: "error", message: res.error });
    }
  }

  function handlePrint() {
    if (!consultation || !clinical) return;
    const patient = consultation.patients as { prenom?: string; nom?: string; numero_dossier?: string } | null;
    const examHtml = buildExamPrintHtml(examCatalog, selectedExamIds);
    printHtml(
      "Fiche consultation",
      `${printLetterhead("Fiche de consultation médicale")}
      <p><strong>Bénéficiaire:</strong> ${patient ? `${patient.prenom} ${patient.nom}` : "-"} (${patient?.numero_dossier ?? "-"})</p>
      <p><strong>Date:</strong> ${formatDate(consultation.date_consultation)}</p>
      <h3>II. Motif</h3><p>${consultation.motif}</p>
      <h3>III. Histoire</h3><p>${clinical.histoire_maladie.debut_evolution || "—"}</p>
      <h3>IV. Examen général</h3><p>TA ${clinical.examen_general.ta} | FC ${clinical.examen_general.fc} | T° ${clinical.examen_general.temperature} | Poids ${clinical.examen_general.poids} kg</p>
      <h3>Diagnostic</h3><p>${consultation.diagnostic ?? "—"}</p>
      <h3>Traitement</h3><p>${consultation.traitement ?? "—"}</p>
      ${examHtml}`
    );
  }

  function handlePrintOrdonnance() {
    if (!consultation || !clinical) return;
    const patient = consultation.patients as { prenom?: string; nom?: string; numero_dossier?: string; date_naissance?: string } | null;
    const medecin = consultation.profiles as { first_name?: string; last_name?: string } | null;
    const age = patient?.date_naissance ? String(Math.max(0, Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000)))) : "";
    printOrdonnance({
      patientName: patient ? `${patient.prenom} ${patient.nom}` : "-",
      patientDossier: patient?.numero_dossier ?? "-",
      patientAge: age ? `${age} ans` : null,
      doctorName: medecin?.last_name ?? "-",
      date: formatDate(consultation.date_consultation),
      motif: consultation.motif,
      diagnostic: consultation.diagnostic,
      items: workflowItems.map((i) => ({
        name: i.item_name,
        type: i.item_type,
        category: i.category ?? "",
        quantity: i.quantity,
        dosage: i.dosage,
        posology: i.posology,
        duration: i.duration,
      })),
      notes: consultation.traitement,
    });
  }

  if (loading) {
    return <AppShell><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div></AppShell>;
  }

  if (!consultation || !clinical) {
    return (
      <AppShell>
        <p className="text-xl font-bold">Consultation introuvable</p>
        <Link href="/consultations" className="btn-secondary mt-4 inline-flex items-center gap-2"><ArrowLeft size={16} /> Retour</Link>
      </AppShell>
    );
  }

  const patient = consultation.patients as { nom?: string; prenom?: string; numero_dossier?: string; type_handicap?: string; niveau_autonomie?: string } | null;
  const medecin = consultation.profiles as { first_name?: string; last_name?: string } | null;
  const relevantPayments = payments.filter(p => p.service_id === params.id || (consultation.patient_id && p.patient_id === consultation.patient_id && p.type?.toLowerCase() === "consultation"));
  const totalPaid = relevantPayments.reduce((sum, p) => sum + (Number(p.montant) || 0), 0);
  const isPaid = relevantPayments.some(p => p.status === "COMPLETED");

  return (
    <AppShell>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/consultations" className="flex items-center gap-1 text-sm text-muted hover:text-primary mb-3"><ArrowLeft size={15} /> Consultations</Link>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Fiche clinique</p>
          <h2 className="text-3xl font-black mt-1">Consultation — {formatDate(consultation.date_consultation)}</h2>
          {patient && (
            <p className="text-muted text-sm mt-1">
              {patient.prenom} {patient.nom} · {patient.numero_dossier}
              {patient.type_handicap ? ` · ${patient.type_handicap}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_COLORS[consultation.status]}>{consultationLabel(consultation.status)}</Badge>
          {isPaid ? (
            <Badge tone="success" className="flex items-center gap-1">
              <CheckCircle size={14} /> Payé ({formatMoney(totalPaid)})
            </Badge>
          ) : (
            <Badge tone="warning" className="flex items-center gap-1">
              <CreditCard size={14} /> Non payé
            </Badge>
          )}
          <select className="input-field w-auto" value={consultation.status} disabled={updatingStatus || editing} onChange={(e) => void updateStatus(e.target.value as Consultation["status"])}>
            {(["EN_ATTENTE", "EN_COURS", "TERMINEE", "ANNULEE"] as const).map((s) => (
              <option key={s} value={s}>{consultationLabel(s)}</option>
            ))}
          </select>
          {editable && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="btn-primary flex items-center gap-2">
              <Pencil size={16} /> Modifier
            </button>
          )}
          {editing && (
            <>
              <button type="button" onClick={() => void saveEdit()} disabled={saving} className="btn-primary flex items-center gap-2">
                <Save size={16} /> {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button type="button" onClick={cancelEdit} className="btn-secondary flex items-center gap-2">
                <X size={16} /> Annuler
              </button>
            </>
          )}
          <button type="button" onClick={handlePrintOrdonnance} className="btn-secondary"><Printer size={16} /> Imprimer l'ordonnance</button>
          <button type="button" onClick={handlePrint} className="btn-secondary"><Printer size={16} /> Imprimer</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ConsultationClinicalForm
            clinical={clinical}
            onChange={setClinical}
            motif={motif}
            onMotifChange={setMotif}
            diagnostic={diagnostic}
            onDiagnosticChange={setDiagnostic}
            traitement={traitement}
            onTraitementChange={setTraitement}
            readOnly={!editing}
          />
          {editing ? (
            <ConsultationExamPrescription
              catalog={examCatalog}
              selectedExamIds={selectedExamIds}
              onSelectionChange={setSelectedExamIds}
            />
          ) : (
            <ExamDisplay catalog={examCatalog} selectedExamIds={selectedExamIds} examStatuses={examStatuses} examResults={examResults} />
          )}
          <ConsultationWorkflowPrescription
            consultationId={params.id}
            patientId={consultation.patient_id}
            prescribedBy={profile?.id || ""}
            initialItems={workflowItems}
            onSave={saveWorkflowPrescriptions}
            onToast={setToast}
          />
          {payments.length > 0 && (
            <section className="medical-card p-6 mt-6">
              <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-primary" /> Paiements associés
              </h3>
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-bold text-text">{p.type}</p>
                      <p className="text-xs text-muted">{formatDate(p.created_at)} · {formatTime(p.created_at)}</p>
                      {p.notes && <p className="text-xs text-muted mt-1">{p.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-primary">{formatMoney(p.montant)}</p>
                      <Badge tone="success" className="mt-1">{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {resultFiles.length > 0 && (
            <section className="medical-card p-6 mt-6">
              <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <FileText size={18} className="text-primary" /> Documents et résultats
              </h3>
              <div className="space-y-2">
                {resultFiles.map((f) => {
                  const { data } = supabase.storage.from("exam-files").getPublicUrl(f.file_path);
                  return (
                    <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft px-4 py-3">
                      {f.mime_type?.startsWith("image/") ? <Image size={18} className="text-primary shrink-0" /> : <FileText size={18} className="text-primary shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{f.file_name}</p>
                        <p className="text-[10px] text-muted">{f.entity_type} · {(f.file_size / 1024).toFixed(0)} KB</p>
                      </div>
                      <a href={data.publicUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1.5 px-3"><Eye size={14} /> Voir</a>
                      <a href={data.publicUrl} download className="btn-secondary text-xs py-1.5 px-3"><Download size={14} /></a>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
        <div className="space-y-4">
          <section className="glass-card p-5">
            <h3 className="text-xs font-bold uppercase text-muted mb-3">Médecin</h3>
            <p className="font-bold">Dr. {medecin?.last_name ?? "—"}</p>
            <p className="text-xs text-muted mt-1">{formatTime(consultation.date_consultation)}</p>
          </section>
          <section className="glass-card p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase text-muted mb-2">Actions</h3>
            <Link href={`/patients/${consultation.patient_id}/results`} className="btn-primary w-full justify-center text-sm flex items-center gap-2">
              <FileText size={14} /> Voir résultats
            </Link>
            <Link href={`/consultations/new?patientId=${consultation.patient_id}`} className="btn-secondary w-full justify-center text-sm flex items-center gap-2">
              <Stethoscope size={14} /> Nouvelle consultation
            </Link>
            <Link href="/reception?tab=enregistrement" className="btn-secondary w-full justify-center text-sm">Voir à la réception</Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
