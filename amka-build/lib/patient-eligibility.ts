import { supabase } from "./supabase";
import type { Patient } from "./types";

/**
 * Bénéficiaires ayant payé la consultation et disposant d'un paiement non encore utilisé
 * (nombre de paiements Consultation COMPLETED > nombre de consultations non annulées).
 */
export async function fetchPatientsEligibleForConsultation(search?: string): Promise<Patient[]> {
  const [{ data: payments }, { data: consultations }] = await Promise.all([
    supabase
      .from("payments")
      .select("patient_id")
      .eq("type", "Consultation")
      .eq("status", "COMPLETED"),
    supabase
      .from("consultations")
      .select("patient_id")
      .neq("status", "ANNULEE"),
  ]);

  const paymentCount = new Map<string, number>();
  for (const row of payments ?? []) {
    paymentCount.set(row.patient_id, (paymentCount.get(row.patient_id) ?? 0) + 1);
  }

  const consultCount = new Map<string, number>();
  for (const row of consultations ?? []) {
    consultCount.set(row.patient_id, (consultCount.get(row.patient_id) ?? 0) + 1);
  }

  const eligibleIds = [...paymentCount.entries()]
    .filter(([id, pays]) => pays > (consultCount.get(id) ?? 0))
    .map(([id]) => id);

  if (eligibleIds.length === 0) return [];

  let req = supabase.from("patients").select("*").eq("is_active", true).in("id", eligibleIds);
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    req = req.or(`nom.ilike.${term},prenom.ilike.${term},numero_dossier.ilike.${term}`);
  }

  const { data, error } = await req.order("nom").limit(20);
  if (error) return [];
  return (data ?? []) as Patient[];
}

export async function isPatientEligibleForConsultation(patientId: string): Promise<boolean> {
  const list = await fetchPatientsEligibleForConsultation();
  return list.some((p) => p.id === patientId);
}
