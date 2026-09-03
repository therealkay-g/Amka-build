import { supabase } from "@/lib/supabase";
import {
  PrescribedItem,
  PrescribedItemStatus,
  PrescriptionBill,
  PrescriptionBillItem,
  ServiceType,
  PharmacyRequestStatus,
  ServiceRequestStatus
} from "@/lib/workflow-types";
import { logAudit } from "@/lib/audit";

export interface CreateBillParams {
  consultationId: string;
  patientId: string;
  medecinId: string;
  createdById: string;
  itemIds: string[];
  customTotal?: number;
}

export interface BillResult {
  invoiceId: string;
  invoiceNumber: string;
  error?: string;
}

/**
 * Récupère les items prescrits (actes ou médicaments) en attente de paiement
 */
export async function getPendingPrescriptionItems() {
  const { data, error } = await supabase
    .from("prescribed_items")
    .select(`
      id,
      consultation_id,
      item_type,
      item_name,
      quantity,
      unit_price,
      total_price,
      status,
      created_at,
      patients:patient_id (id, nom, prenom, numero_dossier),
      consultations:consultation_id (
        id,
        patient_id,
        medecin_id,
        date_consultation,
        profiles:medecin_id (first_name, last_name)
      )
    `)
    .eq("status", "EN_ATTENTE_PAIEMENT")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching pending prescription items:", error);
    throw error;
  }
  return data;
}

/**
 * Crée une facture pour une sélection d'items prescrits
 */
export async function createPrescriptionInvoice({
  consultationId,
  patientId,
  medecinId,
  createdById,
  itemIds,
  customTotal
}: CreateBillParams): Promise<BillResult> {
  try {
    // 1. Récupérer les items pour calculer le total
    const { data: items, error: fetchError } = await supabase
      .from("prescribed_items")
      .select("*")
      .in("id", itemIds);

    if (fetchError || !items) throw new Error(fetchError?.message || "Erreur lors de la récupération des items");

    const calculatedTotal = items.reduce((sum: number, item: any) => sum + item.total_price, 0);
    const finalAmount = customTotal !== undefined ? customTotal : calculatedTotal;

    // 2. Générer un numéro de facture unique
    const billNumber = `INV-PRES-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // 3. Créer la facture
    const { data: bill, error: billError } = await supabase
      .from("prescription_bills")
      .insert({
        bill_number: billNumber,
        consultation_id: consultationId,
        patient_id: patientId,
        billed_by: createdById,
        total_amount: finalAmount,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (billError || !bill) throw new Error(billError?.message || "Erreur création facture");

    // 4. Ajouter les items à la facture
    const billItems = items.map((item: any) => ({
      bill_id: bill.id,
      prescribed_item_id: item.id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsError } = await supabase
      .from("prescription_bill_items")
      .insert(billItems);

    if (itemsError) throw new Error(itemsError.message);

    return { invoiceId: bill.id, invoiceNumber: billNumber };
  } catch (e: any) {
    return { invoiceId: "", invoiceNumber: "", error: e.message };
  }
}

/**
 * Valide le paiement et déclenche la création des demandes de service/pharmacie
 */
export async function validatePrescriptionPayment({
  invoiceId,
  consultationId,
  patientId,
  paymentId
}: {
  invoiceId: string;
  consultationId: string;
  patientId: string;
  paymentId: string;
}) {
  try {
    // 1. Mettre à jour la facture
    const { error: billError } = await supabase
      .from("prescription_bills")
      .update({ status: "PAID", payment_id: paymentId })
      .eq("id", invoiceId);

    if (billError) throw new Error(`Erreur mise à jour facture: ${billError.message}`);

    // 2. Récupérer tous les items liés à cette consultation qui étaient en attente de paiement
    const { data: items, error: itemsError } = await supabase
      .from("prescribed_items")
      .select("*")
      .eq("consultation_id", consultationId)
      .eq("status", "EN_ATTENTE_PAIEMENT");

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      console.warn("Aucun item en attente de paiement trouvé pour cette consultation");
      return { success: true, warning: "Aucun item à activer" };
    }

    // 3. Mettre à jour le statut des items et créer les demandes de service
    const updatePromises = items.map(async (item: any) => {
      try {
        // Mise à jour du statut de l'item
        const { error: statusError } = await supabase
          .from("prescribed_items")
          .update({ status: "PAYE" })
          .eq("id", item.id);
        if (statusError) throw statusError;

        // Historique du statut
        await supabase.from("prescribed_item_history").insert({
          prescribed_item_id: item.id,
          from_status: "EN_ATTENTE_PAIEMENT",
          to_status: "PAYE",
          notes: `Paiement validé via facture ${invoiceId}`,
        });

        if (item.item_type === 'medical_act') {
          const serviceMapping: Record<string, string> = {
            'HOSPITALISATION': 'hospitalisation',
            'SOINS_INFIRMIERS': 'soins_infirmiers',
            'PANSEMENT': 'pansements',
            'PANSEMENTS': 'pansements',
            'PLATRE': 'platres',
            'PLATRES': 'platres',
            'CHIRURGIE': 'chirurgie',
            'KINESITHERAPIE': 'kinesitherapie',
            'INFILTRATION': 'soins_infirmiers',
          };

          // Normalisation pour éviter les problèmes d'accents ou de casse
          const categoryKey = item.category?.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "") || "";
          const serviceType = serviceMapping[categoryKey] || item.category?.toLowerCase() || 'hospitalisation';

        // Création demande de service - On récupère l'ID pour le lier au paiement
        const { data: serviceRequest, error: serviceError } = await supabase
          .from("service_requests")
          .insert({
            prescribed_item_id: item.id,
            patient_id: patientId,
            consultation_id: consultationId,
            bill_id: invoiceId,
            service_type: serviceType,
            status: "EN_ATTENTE",
          })
          .select("id")
          .single();

        if (serviceError) throw new Error(`Erreur demande service: ${serviceError.message}`);

        // Lier le paiement à cette demande de service pour que le module affiche "Payé"
        await supabase
          .from("payments")
          .update({ service_id: serviceRequest.id })
          .eq("id", paymentId);

        // Passer l'item à "En attente d'exécution"
        await supabase.from("prescribed_items").update({ status: "EN_ATTENTE_EXECUTION" }).eq("id", item.id);
        } else if (item.item_type === "medication") {
          // Création demande pharmacie
          const { error: pharmaError } = await supabase
            .from("pharmacy_requests")
            .insert({
              prescribed_item_id: item.id,
              patient_id: patientId,
              consultation_id: consultationId,
              bill_id: invoiceId,
              status: "EN_ATTENTE",
            });
          if (pharmaError) throw new Error(`Erreur demande pharmacie: ${pharmaError.message}`);

          // Le workflow dit "Payé - En attente de délivrance"
          await supabase.from("prescribed_items").update({ status: "PAYE" }).eq("id", item.id);
        }
      } catch (innerError) {
        console.error(`Erreur traitement item ${item.id}:`, innerError);
        throw innerError;
      }
    });

    await Promise.all(updatePromises);

    return { success: true };
  } catch (e: any) {
    console.error("Payment validation error:", e);
    throw new Error(e.message || "Erreur lors de la validation du paiement");
  }
}
