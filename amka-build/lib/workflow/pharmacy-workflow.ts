import { supabase } from "@/lib/supabase";
import { PharmacyRequest, PharmacyRequestStatus } from "@/lib/workflow-types";
import { logAudit, createNotification } from "@/lib/audit";

export async function getPendingPharmacyRequests() {
  const { data, error } = await supabase
    .from("pharmacy_requests")
    .select(`
      *,
      patients:patient_id(*),
      consultations:consultation_id(*),
      prescribed_item:prescribed_item_id(*)
    `)
    .eq("status", "EN_ATTENTE")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function updatePharmacyRequestStatus(
  requestId: string,
  status: PharmacyRequestStatus,
  dispensedBy: string | null = null,
  notes: string | null = null
) {
  const { data: request, error: reqError } = await supabase
    .from("pharmacy_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqError || !request) throw reqError;

  // 1. Update status
  const { error: updateError } = await supabase
    .from("pharmacy_requests")
    .update({
      status,
      dispensed_by: dispensedBy || request.dispensed_by,
      notes: notes || request.notes,
    })
    .eq("id", requestId);

  if (updateError) throw updateError;

  // 2. Update prescribed item status
  const itemStatus = status === "DELIVRE" ? "TERMINE" : status === "EN_PREPARATION" ? "EN_COURS" : "EN_ATTENTE_EXECUTION";
  await supabase
    .from("prescribed_items")
    .update({ status: itemStatus })
    .eq("id", request.prescribed_item_id);

  // 3. Stock decrement if delivered
  if (status === "DELIVRE") {
    const { data: item } = await supabase
      .from("prescribed_items")
      .select("*")
      .eq("id", request.prescribed_item_id)
      .single();

    if (item) {
      const medicationId = item.item_id;
      if (medicationId) {
        // Safe stock update
        const { data: med } = await supabase.from("medications").select("stock").eq("id", medicationId).single();
        if (med) {
          const newStock = Math.max(0, (med.stock || 0) - (item.quantity || 0));
          await supabase.from("medications").update({ stock: newStock }).eq("id", medicationId);

          await supabase.from("pharmacy_stock_movements").insert({
            medication_id: medicationId,
            type: "SORTIE",
            quantity: item.quantity,
            reason: `Délivrance prescription - Facture ${request.bill_id}`,
          });
        }
      }

      // Notify Doctor
      const { data: consultation } = await supabase
        .from("consultations")
        .select("medecin_id")
        .eq("id", request.consultation_id!)
        .single();

      if (consultation?.medecin_id) {
        await createNotification({
          type: "pharmacy",
          title: "Médicament délivré",
          message: `Le médicament pour le patient ${item.patients?.nom ?? "inconnu"} a été délivré.`,
          module: "pharmacie",
          entityId: request.id,
        });
      }
    }
  }

  return { success: true };
}
