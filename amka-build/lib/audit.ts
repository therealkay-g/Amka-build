import { supabase } from "./supabase";

export async function logAudit(params: {
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("audit_logs").insert({
      user_id: user?.id ?? null,
      action: params.action,
      module: params.module,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      details: params.details ?? null,
    });
  } catch (error) {
    console.warn("Error creating audit log (ignored):", error);
  }
}

export async function logActivity(params: {
  action: string;
  module: string;
  details?: string;
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("user_activities").insert({
      user_id: user.id,
      action: params.action,
      module: params.module,
      details: params.details ?? null,
    });
  } catch (error) {
    console.warn("Error creating activity log (ignored):", error);
  }
}

export async function createNotification(params: {
  type: string;
  title: string;
  message: string;
  module: string;
  entityId?: string;
  userId?: string;
}) {
  try {
    await supabase.from("notifications").insert({
      user_id: params.userId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
      module: params.module,
      entity_id: params.entityId ?? null,
      is_read: false,
    });
  } catch (error) {
    console.warn("Error creating notification (ignored):", error);
  }
}

export async function syncPaymentCompleted(params: {
  patientId: string;
  montant: number;
  type: string;
  module: string;
}) {
  await createNotification({
    type: "payment",
    title: "Paiement perçu",
    message: `Paiement de ${params.montant} $ pour ${params.type}`,
    module: params.module,
  });

  await logAudit({
    action: "PAYMENT_COMPLETED",
    module: params.module,
    details: params,
  });
}
