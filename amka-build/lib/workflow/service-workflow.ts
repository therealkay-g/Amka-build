import { supabase } from "@/lib/supabase";
import { ServiceRequestStatus } from "@/lib/workflow-types";
import { logAudit, createNotification } from "@/lib/audit";

export async function getPendingServiceRequests(serviceType: string) {
  const { data, error } = await supabase
    .from("service_requests")
    .select(`
      *,
      patients:patient_id(*),
      consultations:consultation_id(*),
      prescribed_item:prescribed_item_id(*)
    `)
    .eq("service_type", serviceType)
    .in("status", ["EN_ATTENTE", "ACCEPTE"])
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateServiceRequestStatus(
  requestId: string,
  status: ServiceRequestStatus,
  assignedTo: string | null = null,
  notes: string | null = null,
  resultText: string | null = null
) {
  console.log(`[Workflow] Updating request ${requestId} to status ${status}`);

  const { data: request, error: reqError } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqError || !request) {
    console.error("[Workflow] Request not found:", reqError);
    throw reqError || new Error("Service request not found");
  }

  // 1. Update status
  const { error: updateError } = await supabase
    .from("service_requests")
    .update({
      status,
      assigned_to: assignedTo || request.assigned_to,
      notes: notes || request.notes,
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("[Workflow] Update status error:", updateError);
    throw updateError;
  }

  // 2. If completed and result provided, save to results hub
  if (status === "TERMINE" && resultText) {
    console.log(`[Workflow] Saving results for request ${requestId}. ResultText: ${resultText}`);

    if (!request.consultation_id) {
      console.error(`[Workflow] No consultation_id found for request ${requestId}. Patient: ${request.patient_id}`);
      throw new Error("Impossible de sauvegarder le résultat : aucune consultation associée à cette demande.");
    } else {
      try {
        // 1. Recover the specific name of the prescribed item to make the report clearer
        let itemName = "Acte Médical";
        if (request.prescribed_item_id) {
          const { data: item } = await supabase
            .from("prescribed_items")
            .select("item_name")
            .eq("id", request.prescribed_item_id)
            .single();
          if (item) itemName = item.item_name;
        }

        // 2. Find the generic "Acte Médical" category (the bucket for all service results)
        const categoryName = "Acte Médical";
        const { data: examData, error: fetchError } = await supabase
          .from("exams")
          .select("id")
          .eq("name", categoryName)
          .maybeSingle();

        if (fetchError) {
          console.error(`[Workflow] Error fetching exam category:`, fetchError);
          throw fetchError;
        }

        if (!examData) {
          console.warn(`[Workflow] Category '${categoryName}' NOT found in exams table.`);
          throw new Error(`La catégorie d'examen '${categoryName}' est manquante. Veuillez demander à l'administrateur de la créer dans le catalogue des examens.`);
        }

        // 3. Format the report to include the specific act name at the top
        const enrichedReport = `ACTE : ${itemName}\n----------------------------------\n${resultText}`;

        console.log(`[Workflow] Found exam category ${categoryName} with ID ${examData.id}. Inserting result for ${itemName}...`);
        const { error: insertError } = await supabase
          .from("consultation_exams")
          .insert({
            consultation_id: request.consultation_id,
            exam_id: examData.id,
            results: { report: enrichedReport, date: new Date().toISOString() },
            status: "TERMINE",
          });

        if (insertError) {
          console.error("[Workflow] Error inserting results into consultation_exams:", insertError);
          throw insertError;
        }
        console.log(`[Workflow] Successfully saved result for request ${requestId}`);
      } catch (e: any) {
        console.error("[Workflow] Critical error saving results:", e);
        throw e;
      }
    }
  }

  // 3. CREATE RECORD IN SERVICE MODULE TABLE (Crucial for stats and visibility)
  if (status === "ACCEPTE") {
    const serviceMapping: Record<string, string> = {
      'hospitalisation': 'hospitalizations',
      'soins_infirmiers': 'nursing_care',
      'pansements': 'dressings',
      'platres': 'plasters',
      'chirurgie': 'surgeries',
      'kinesitherapie': 'kinesitherapie_sessions',
      'infiltration': 'nursing_care',
    };

    const categoryKey = request.service_type?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") || "";
    const targetTable = serviceMapping[categoryKey] || request.service_type;

    const defaults: Record<string, any> = {
      status: "EN_COURS",
      created_at: new Date().toISOString(),
    };

    if (targetTable === 'hospitalizations') {
      defaults.montant_journalier = 0;
    } else {
      defaults.montant = 0;
    }

    if (targetTable === 'hospitalizations') {
      Object.assign(defaults, { motif_admission: "Prise en charge via prescription", chambre: "À définir", lit: "À définir" });
    } else if (targetTable === 'surgeries') {
      Object.assign(defaults, { type_intervention: "À préciser", salle: "À définir", duree_minutes: 0 });
    } else if (targetTable === 'kinesitherapie_sessions') {
      Object.assign(defaults, { type_seance: "À préciser", duree_minutes: 30, evaluation_douleur: 0 });
    } else if (targetTable === 'nursing_care') {
      Object.assign(defaults, { type_soin: "À préciser", description: "Prise en charge via prescription" });
    } else if (targetTable === 'plasters') {
      Object.assign(defaults, { zone_corps: "À préciser", type_platre: "À préciser" });
    } else if (targetTable === 'dressings') {
      Object.assign(defaults, { zone_corps: "À préciser", type_pansement: "À préciser" });
    }

    const { error: insertError } = await supabase
      .from(targetTable)
      .insert({
        patient_id: request.patient_id,
        ...defaults,
      });

    if (insertError) {
      console.error(`CRITICAL: Failed to create record in ${targetTable} for patient ${request.patient_id}. Error:`, insertError);
      throw new Error(`Erreur lors de l'activation du service ${targetTable}: ${insertError.message}`);
    }
  }

  // 4. Update prescribed item status
  let itemStatus = "EN_ATTENTE_EXECUTION";
  if (status === "TERMINE") itemStatus = "TERMINE";
  else if (status === "EN_COURS") itemStatus = "EN_COURS";
  else if (status === "VALIDE") itemStatus = "VALIDE";

  if (request.prescribed_item_id) {
    await supabase
      .from("prescribed_items")
      .update({ status: itemStatus })
      .eq("id", request.prescribed_item_id);
  }

  // 5. Notify Doctor if completed
  if (status === "TERMINE") {
    const { data: consultation } = await supabase
      .from("consultations")
      .select("medecin_id")
      .eq("id", request.consultation_id!)
      .single();

    if (consultation?.medecin_id) {
      await createNotification({
        type: "service",
        title: "Acte médical terminé",
        message: `Le service ${request.service_type} pour le patient ${request.patients?.nom ?? "inconnu"} a été terminé.`,
        module: "services",
        entityId: request.id,
        userId: consultation.medecin_id,
      });
    }
  }

  return { success: true };
}
