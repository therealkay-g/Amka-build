import { supabase } from "./supabase";
import { syncPaymentCompleted, createNotification, logActivity } from "./audit";
import { formatMoney } from "./utils";

type ServiceLink = {
  table: string;
  paymentType: string;
  serviceField?: string;
};

const PAYMENT_SERVICE_MAP: ServiceLink[] = [
  { table: "laboratory_exams", paymentType: "Laboratoire" },
  { table: "eg_exams", paymentType: "EG" },
  { table: "ecg_exams", paymentType: "ECG" },
  { table: "radiology_exams", paymentType: "Radiologie" },
  { table: "kinesitherapie_sessions", paymentType: "Kinésithérapie" },
  { table: "surgeries", paymentType: "Chirurgie" },
  { table: "hospitalizations", paymentType: "Hospitalisation" },
  { table: "nursing_care", paymentType: "Soins infirmiers" },
  { table: "plasters", paymentType: "Plâtre" },
  { table: "dressings", paymentType: "Pansement" },
];

const RECEPTION_SERVICE_MAP: Record<string, string> = {
  Consultation: "Consultation",
  Kinésithérapie: "Kinésithérapie",
  Laboratoire: "Laboratoire",
  EG: "EG",
  ECG: "ECG",
  Radiologie: "Radiologie",
  Chirurgie: "Chirurgie",
  Hospitalisation: "Hospitalisation",
  Pharmacie: "Pharmacie",
  Pansement: "Pansement",
  Plâtre: "Plâtre",
  "Soins infirmiers": "Soins infirmiers",
};

export async function processPaymentCompleted(params: {
  paymentId: string;
  patientId: string;
  montant: number;
  type: string;
}) {
  const { paymentId, patientId, montant, type } = params;

  await syncPaymentCompleted({
    patientId,
    montant,
    type,
    module: "perception",
  });

  await logActivity({
    action: "Paiement synchronisé",
    module: "perception",
    details: `${formatMoney(montant)} — ${type}`,
  });

  const serviceLink = PAYMENT_SERVICE_MAP.find((s) => s.paymentType === type);
  if (serviceLink) {
    const { data: pending } = await supabase
      .from(serviceLink.table)
      .select("id")
      .eq("patient_id", patientId)
      .eq("status", "EN_ATTENTE")
      .is("payment_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending) {
      await supabase
        .from(serviceLink.table)
        .update({ payment_id: paymentId, status: "EN_COURS" })
        .eq("id", pending.id);

      await supabase
        .from("payments")
        .update({ service_id: pending.id, service_type: type.toLowerCase() })
        .eq("id", paymentId);
    } else {
      await supabase
        .from("payments")
        .update({ service_type: type.toLowerCase() })
        .eq("id", paymentId);
    }
  }

  const receptionService = RECEPTION_SERVICE_MAP[type];
  if (receptionService) {
    const { data: reception } = await supabase
      .from("receptions")
      .select("id")
      .eq("patient_id", patientId)
      .eq("service_destine", receptionService)
      .in("status", ["EN_ATTENTE", "EN_COURS"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reception) {
      await supabase
        .from("receptions")
        .update({ status: "EN_COURS", notes: `Paiement validé (${formatMoney(montant)})` })
        .eq("id", reception.id);
    }

    const { data: receptionists } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["RECEPTIONIST", "ADMIN"])
      .eq("is_active", true);

    for (const r of receptionists ?? []) {
      await createNotification({
        type: "payment",
        title: "Paiement perçu — service disponible",
        message: `${type} payé (${formatMoney(montant)}). Le bénéficiaire peut être orienté.`,
        module: "reception",
        entityId: paymentId,
        userId: r.id,
      });
    }
  }

  if (type === "Consultation") {
    await createNotification({
      type: "consultation",
      title: "Consultation disponible",
      message: `Paiement consultation validé (${formatMoney(montant)}). Le médecin peut recevoir le patient.`,
      module: "consultations",
      entityId: paymentId,
    });
  }

  if (type === "Pharmacie") {
    await createNotification({
      type: "pharmacy",
      title: "Paiement pharmacie",
      message: `Paiement pharmacie de ${formatMoney(montant)} enregistré.`,
      module: "pharmacie",
      entityId: paymentId,
    });
  }
}

export async function hasConsultationPayment(patientId: string): Promise<boolean> {
  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("type", "Consultation")
    .eq("status", "COMPLETED");
  return (count ?? 0) > 0;
}
