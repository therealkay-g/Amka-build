import { supabase } from "@/lib/supabase";
import { eventBus } from "@/lib/event-bus";
import { logAudit, logActivity, createNotification } from "@/lib/audit";
import type { ExamStatus, ExamEventPayload } from "@/lib/exam-workflow-types";

// ─── Status Helpers ───────────────────────────────────────────

async function setConsultationExamStatus(
  consultationExamId: string,
  newStatus: ExamStatus,
  changedById?: string,
  notes?: string
) {
  const { data: old } = await supabase
    .from("consultation_exams")
    .select("status")
    .eq("id", consultationExamId)
    .maybeSingle();

  await supabase
    .from("consultation_exams")
    .update({ status: newStatus, status_updated_at: new Date().toISOString() })
    .eq("id", consultationExamId);

  await supabase.from("exam_status_history").insert({
    consultation_exam_id: consultationExamId,
    previous_status: old?.status ?? null,
    new_status: newStatus,
    changed_by: changedById ?? null,
    notes: notes ?? null,
  });
}

// ─── After Consultation Save ──────────────────────────────────

export async function onConsultationSaved(payload: {
  consultationId: string;
  patientId: string;
  medecinId: string;
  examIds: string[];
}) {
  if (payload.examIds.length === 0) return;

  const { data: ceIds } = await supabase
    .from("consultation_exams")
    .select("id")
    .eq("consultation_id", payload.consultationId)
    .in("exam_id", payload.examIds);

  if (ceIds) {
    for (const ce of ceIds) {
      await setConsultationExamStatus(ce.id, "EN_ATTENTE_PAIEMENT", payload.medecinId);
    }
  }

  eventBus.emit("exam:awaiting-payment", {
    consultationId: payload.consultationId,
    patientId: payload.patientId,
    examIds: payload.examIds,
    status: "EN_ATTENTE_PAIEMENT",
  } as ExamEventPayload);
}

// ─── Invoice & Payment ────────────────────────────────────────

export async function createExamInvoice(params: {
  consultationId: string;
  patientId: string;
  medecinId?: string;
  createdById: string;
  consultationExamIds: string[];
  customTotal?: number;
}): Promise<{ invoiceId?: string; invoiceNumber?: string; error?: string }> {
  const { data: examData } = await supabase
    .from("consultation_exams")
    .select("id, exam_id, exams(name, price, exam_categories(name))")
    .in("id", params.consultationExamIds)
    .is("invoice_id", null);

  if (!examData || examData.length === 0) return { error: "Aucun examen trouvé" };

  const { data: invNumber } = await supabase.rpc("generate_invoice_number");
  const invoiceNumber = (invNumber as string) || `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

  const total = params.customTotal ?? examData.reduce((s: number, ce: Record<string, unknown>) => {
    const exam = ce.exams as { price?: number } | null;
    return s + (exam?.price ?? 0);
  }, 0);

  const items = examData.map((ce: Record<string, unknown>) => {
    const exam = ce.exams as { name: string; price: number; exam_categories: { name: string } } | null;
    const cat = exam?.exam_categories;
    const price = exam?.price ?? 0;
    return {
      consultation_exam_id: ce.id,
      exam_id: ce.exam_id,
      exam_name: exam?.name ?? "Inconnu",
      category_name: cat?.name ?? "Général",
      quantity: 1,
      unit_price: price,
      total_price: price,
    };
  });

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      consultation_id: params.consultationId,
      patient_id: params.patientId,
      medecin_id: params.medecinId ?? null,
      total_amount: total,
      status: "EN_ATTENTE",
      created_by: params.createdById,
    })
    .select("id")
    .single();

  if (error || !invoice) return { error: error?.message ?? "Erreur création facture" };

  const invoiceItems = items.map((item: { consultation_exam_id: string; exam_id: string; exam_name: string; category_name: string; quantity: number; unit_price: number; total_price: number }) => ({ ...item, invoice_id: invoice.id }));
  await supabase.from("invoice_items").insert(invoiceItems);

  await supabase
    .from("consultation_exams")
    .update({ invoice_id: invoice.id })
    .in("id", params.consultationExamIds);

  return { invoiceId: invoice.id, invoiceNumber };
}

export async function onPaymentValidated(payload: {
  invoiceId: string;
  consultationId: string;
  patientId: string;
}) {
  await supabase
    .from("invoices")
    .update({ status: "PAYEE", paid_at: new Date().toISOString() })
    .eq("id", payload.invoiceId);

  const { data: ceList } = await supabase
    .from("consultation_exams")
    .select("id, exam_id, exams(name, exam_categories(name))")
    .eq("invoice_id", payload.invoiceId);

  if (!ceList) return;

  for (const ce of ceList) {
    await setConsultationExamStatus(ce.id, "EN_ATTENTE_EXECUTION");
  }

  const examIds = ceList.map((ce: { id: string }) => ce.id);
  const cats: Record<string, string[]> = {};
  for (const ce of ceList) {
    const exam = ce.exams as { name: string; exam_categories: { name: string } } | null;
    const catName = exam?.exam_categories?.name ?? "Général";
    if (!cats[catName]) cats[catName] = [];
    cats[catName].push(exam?.name ?? "Inconnu");
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("invoice_number, consultations(patient_id, medecin_id, patients(nom, prenom, numero_dossier), profiles(first_name, last_name))")
    .eq("id", payload.invoiceId)
    .maybeSingle();

  const inv = invoice as {
    invoice_number: string;
    consultations?: {
      patient_id: string;
      medecin_id: string;
      patients?: { nom: string; prenom: string; numero_dossier: string };
      profiles?: { first_name: string; last_name: string };
    };
  } | null;

  const c = inv?.consultations;
  const patient = c?.patients;
  const medecin = c?.profiles;
  const patientName = patient ? `${patient.prenom} ${patient.nom}` : "—";
  const medecinName = medecin ? `Dr. ${medecin.last_name}` : "—";

  for (const [catName, examNames] of Object.entries(cats)) {
    const serviceModule = catName === "Laboratoire" ? "laboratoire"
      : catName === "ECG" ? "ecg"
      : catName === "EEG" ? "eg"
      : catName === "Radiologie" ? "radiologie"
      : null;

    if (serviceModule) {
      const examList = examNames.join(", ");
      await createNotification({
        type: "exam_request",
        title: `Nouvel examen : ${catName}`,
        message: `Patient: ${patientName} (${patient?.numero_dossier ?? ""})\nMédecin: ${medecinName}\nFacture: ${inv?.invoice_number}\nExamens: ${examList}`,
        module: serviceModule,
        entityId: payload.consultationId,
      });

      await logActivity({
        action: `Demande d'examen: ${catName}`,
        module: serviceModule,
        details: `Patient: ${patientName} - ${examList}`,
      });

    }
  }

  await logAudit({
    action: "PAYMENT_VALIDATED",
    module: "perception",
    entityId: payload.invoiceId,
    details: { invoiceId: payload.invoiceId, consultationId: payload.consultationId },
  });

  eventBus.emit("exam:paid", {
    consultationId: payload.consultationId,
    patientId: payload.patientId,
    invoiceNumber: inv?.invoice_number,
    examIds,
    status: "EN_ATTENTE_EXECUTION",
  } as ExamEventPayload);
}

// ─── Exam Execution ──────────────────────────────────────────

export async function onExamStarted(consultationExamId: string, userId: string) {
  await setConsultationExamStatus(consultationExamId, "EN_COURS", userId);

  const { data: ce } = await supabase
    .from("consultation_exams")
    .select("consultation_id, exam_id, exams(name, exam_categories(name))")
    .eq("id", consultationExamId)
    .maybeSingle();

  if (ce) {
    const exam = ce.exams as { name: string; exam_categories: { name: string } } | null;
    const catName = exam?.exam_categories?.name ?? "";

    const { data: consultation } = await supabase
      .from("consultations")
      .select("patient_id")
      .eq("id", ce.consultation_id)
      .maybeSingle();

    const patientId = (consultation as { patient_id: string } | null)?.patient_id;

    if (patientId && exam) {
      const moduleTable = catName === "Laboratoire" ? "laboratory_exams"
        : catName === "ECG" ? "ecg_exams"
        : catName === "EEG" ? "eg_exams"
        : catName === "Radiologie" ? "radiology_exams"
        : null;

      if (moduleTable) {
        const dateField = moduleTable === "laboratory_exams" ? "date_prescription" : "date_examen";
        await supabase.from(moduleTable).insert({
          patient_id: patientId,
          type_examen: exam.name,
          montant: 0,
          status: "EN_COURS",
          notes: `Issu de la consultation #${ce.consultation_id}`,
          [dateField]: new Date().toISOString(),
        });
      }
    }
  }

  await supabase
    .from("consultation_exams")
    .update({ started_at: new Date().toISOString() })
    .eq("id", consultationExamId);
}

export async function saveExamResult(
  consultationExamId: string,
  userId: string,
  results: Record<string, unknown>
) {
  await supabase
    .from("consultation_exams")
    .update({ results, resulted_at: new Date().toISOString() })
    .eq("id", consultationExamId);

  await onExamCompleted(consultationExamId, userId, results);
}

export async function onExamCompleted(
  consultationExamId: string,
  userId: string,
  resultData?: Record<string, unknown>
) {
  await setConsultationExamStatus(consultationExamId, "TERMINE", userId);

  const { data: ce } = await supabase
    .from("consultation_exams")
    .select("consultation_id, exam_id, exams(name, exam_categories(name))")
    .eq("id", consultationExamId)
    .maybeSingle();

  if (ce) {
    const exam = ce.exams as { name: string; exam_categories: { name: string } } | null;
    const catName = exam?.exam_categories?.name ?? "Général";
    const examName = exam?.name ?? "Inconnu";

    const { data: consultation } = await supabase
      .from("consultations")
      .select("patient_id, medecin_id, patients(nom, prenom, numero_dossier), profiles(first_name, last_name)")
      .eq("id", ce.consultation_id)
      .maybeSingle();

    const c = consultation as {
      patient_id: string;
      medecin_id: string;
      patients?: { nom: string; prenom: string; numero_dossier: string };
      profiles?: { first_name: string; last_name: string };
    } | null;

    const patientName = c?.patients ? `${c.patients.prenom} ${c.patients.nom}` : "—";
    const medecinName = c?.profiles ? `Dr. ${c.profiles.last_name}` : "—";

    await createNotification({
      type: "exam_result",
      title: `Résultat disponible : ${catName}`,
      message: `Patient: ${patientName} (${c?.patients?.numero_dossier ?? ""})\nExamen: ${examName}\nMédecin: ${medecinName}`,
      module: "consultations",
      entityId: ce.consultation_id,
      userId: c?.medecin_id,
    });
  }

  eventBus.emit("exam:completed", {
    consultationId: ce?.consultation_id ?? "",
    examIds: [consultationExamId],
    status: "TERMINE",
  } as ExamEventPayload);
}

// ─── Queries ──────────────────────────────────────────────────

export async function getConsultationExamStatuses(consultationId: string) {
  const { data } = await supabase
    .from("consultation_exams")
    .select("id, exam_id, status, status_updated_at, results, resulted_at, exams(name, exam_categories(name))")
    .eq("consultation_id", consultationId);

  return (data ?? []) as {
    id: string;
    exam_id: string;
    status: string;
    status_updated_at: string;
    results: Record<string, unknown> | null;
    resulted_at: string | null;
    exams: { name: string; exam_categories: { name: string } } | null;
  }[];
}

export async function getPendingBillingExams() {
  const { data } = await supabase
    .from("consultation_exams")
    .select("id, consultation_id, exam_id, status, created_at, consultations(patient_id, motif, medecin_id, date_consultation, patients(nom, prenom, numero_dossier, sexe, date_naissance), profiles(first_name, last_name)), exams(name, price, exam_categories(name))")
    .eq("status", "EN_ATTENTE_PAIEMENT")
    .order("created_at", { ascending: false });

  return (data ?? []) as {
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
  }[];
}

export async function getPendingExamRequests(serviceCategory: string) {
  return getWorkflowExams("EN_ATTENTE_EXECUTION", serviceCategory);
}

export async function getInProgressExams(serviceCategory: string) {
  return getWorkflowExams("EN_COURS", serviceCategory);
}

async function getWorkflowExams(status: string, serviceCategory: string) {
  const { data } = await supabase
    .from("consultation_exams")
    .select("id, consultation_id, exam_id, status, status_updated_at, created_at, results, consultations(patient_id, date_consultation, patients(nom, prenom, numero_dossier, sexe, date_naissance), profiles(first_name, last_name)), exams(name, price, exam_categories(name))")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (!data) return [];

  const result = data.filter((item: Record<string, unknown>) => {
    const exam = item.exams as { exam_categories: { name: string } } | null;
    return exam?.exam_categories?.name === serviceCategory;
  });

  return result as {
    id: string;
    consultation_id: string;
    exam_id: string;
    status: string;
    status_updated_at: string;
    created_at: string;
    results: Record<string, unknown> | null;
    consultations: {
      patient_id: string;
      date_consultation: string;
      patients: { nom: string; prenom: string; numero_dossier: string; sexe: string; date_naissance: string } | null;
      profiles: { first_name: string; last_name: string } | null;
    } | null;
    exams: { name: string; price: number; exam_categories: { name: string } } | null;
  }[];
}
