import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { PrescribedItemStatus } from "@/lib/workflow-types";

export interface PrescribedItemInput {
  item_id: string;
  item_name: string;
  item_type: 'medical_act' | 'medication';
  unit_price: number;
  total_price: number;
  quantity: number;
  category: string;
  dosage?: string;
  posology?: string;
  duration?: string;
  notes?: string;
}

export async function saveConsultationPrescriptions(
  consultationId: string,
  patientId: string,
  prescribedBy: string,
  items: PrescribedItemInput[]
) {
  try {
    // 1. Clear existing prescriptions for this consultation to avoid duplicates on update
    // Or we can handle it more gracefully, but for simplicity in this version, we replace.
    await supabase.from("prescribed_items").delete().eq("consultation_id", consultationId);

    // 2. Insert new items
    const inserts = items.map((item: PrescribedItemInput) => ({
      consultation_id: consultationId,
      patient_id: patientId,
      prescribed_by: prescribedBy,
      item_type: item.item_type,
      item_id: item.item_id,
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      dosage: item.dosage,
      posology: item.posology,
      duration: item.duration,
      notes: item.notes,
      status: "EN_ATTENTE_PAIEMENT",
    }));

    const { data, error } = await supabase.from("prescribed_items").insert(inserts).select();

    if (error) throw error;

    // 3. Create history entries
    const history = data.map((item: any) => ({
      prescribed_item_id: item.id,
      from_status: null,
      to_status: "EN_ATTENTE_PAIEMENT",
      changed_by: prescribedBy,
      notes: "Prescription initiale",
    }));

    await supabase.from("prescribed_item_history").insert(history);

    await logAudit({
      action: "SAVE_PRESCRIPTIONS",
      module: "consultations",
      entityId: consultationId,
      details: { items_count: items.length }
    });

    return { success: true, data };
  } catch (e: any) {
    console.error("Error saving prescriptions:", e);
    return { success: false, error: e.message };
  }
}

export async function getConsultationPrescriptions(consultationId: string) {
  const { data, error } = await supabase
    .from("prescribed_items")
    .select("*")
    .eq("consultation_id", consultationId);

  if (error) throw error;
  return data;
}
