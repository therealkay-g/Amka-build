export type ExamStatus =
  | "PRESCRIT"
  | "EN_ATTENTE_PAIEMENT"
  | "PAYE"
  | "EN_ATTENTE_EXECUTION"
  | "EN_COURS"
  | "TERMINE"
  | "RESULTAT_VALIDE";

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  PRESCRIT: "Prescrit",
  EN_ATTENTE_PAIEMENT: "En attente de paiement",
  PAYE: "Payé",
  EN_ATTENTE_EXECUTION: "En attente d'exécution",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  RESULTAT_VALIDE: "Résultat validé",
};

export const EXAM_STATUS_COLORS: Record<ExamStatus, "warning" | "primary" | "success" | "error" | "secondary"> = {
  PRESCRIT: "warning",
  EN_ATTENTE_PAIEMENT: "warning",
  PAYE: "primary",
  EN_ATTENTE_EXECUTION: "primary",
  EN_COURS: "secondary",
  TERMINE: "success",
  RESULTAT_VALIDE: "success",
};

export type ExamEventType =
  | "exam:prescribed"
  | "exam:awaiting-payment"
  | "exam:paid"
  | "exam:request-created"
  | "exam:in-progress"
  | "exam:completed"
  | "exam:result-validated";

export type ExamEventPayload = {
  consultationId: string;
  patientId: string;
  patientName?: string;
  patientDossier?: string;
  medecinName?: string;
  invoiceNumber?: string;
  examIds: string[];
  examNames?: string[];
  categoryName?: string;
  status?: ExamStatus;
};
