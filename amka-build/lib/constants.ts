export const CENTER_INFO = {
  name: "Centre pour handicapés AMKA de Kindu A.S.B.L",
  shortName: "AMKA Kindu",
  legalForm: "A.S.B.L",
  phone: "+243815615323",
  address: "Kindu, République Démocratique du Congo",
  email: "contact@amka-kindu.cd",
  currency: "CDF",
  dossierPrefix: "AMKA",
} as const;

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export const PRIORITY_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  URGENT: "Urgent",
  CRITIQUE: "Critique",
};

export const HANDICAP_TYPES = [
  "Moteur",
  "Visuel",
  "Auditif",
  "Intellectuel",
  "Psychique",
  "Polyhandicap",
  "Autre",
];

export const AUTONOMIE_LEVELS = [
  "Autonome",
  "Partiellement autonome",
  "Dépendant",
  "Totalement dépendant",
];

export const CORE_SERVICES = [
  "Consultation",
  "Kinésithérapie",
  "Laboratoire",
  "EG",
  "ECG",
  "Radiologie",
  "Chirurgie",
  "Hospitalisation",
  "Pharmacie",
  "Pansement",
  "Plâtre",
  "Soins infirmiers",
] as const;

export const PAYMENT_TYPES = [...CORE_SERVICES, "Forfait réadaptation", "Autre"];

export const SERVICES_DESTINATION = CORE_SERVICES;
