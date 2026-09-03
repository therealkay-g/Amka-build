export type UserRole =
  | "ADMIN"
  | "RECEPTIONIST"
  | "MEDECIN_DIRECTEUR"
  | "MEDECIN_1"
  | "MEDECIN_2"
  | "MEDECIN_3"
  | "MEDECIN_4"
  | "PERCEPTEUR"
  | "PHARMACIEN"
  | "COMPTABLE"
  | "ORTHOPEDISTE"
  | "PSYCHIATRE"
  | "LABORANTIN"
  | "TECHNICIEN_EG"
  | "TECHNICIEN_ECG"
  | "RADIOLOGUE"
  | "KINESITHERAPEUTE"
  | "CHIRURGIEN"
  | "INFIRMIER"
  | "CAISSIER";

export type ServiceStatus = "EN_ATTENTE" | "EN_COURS" | "TERMINE" | "ANNULE";
export type ExamPriority = "NORMAL" | "URGENT" | "CRITIQUE";

export type Patient = {
  id: string;
  numero_dossier: string;
  nom: string;
  prenom: string;
  postnom: string | null;
  sexe: "MASCULIN" | "FEMININ";
  date_naissance: string;
  telephone: string | null;
  adresse: string | null;
  type_handicap: string | null;
  niveau_autonomie: string | null;
  contact_urgence: string | null;
  telephone_urgence: string | null;
  medecin_referent: string | null;
  date_admission: string | null;
  appareillage: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  phone: string | null;
  theme_preference: "light" | "dark" | null;
  created_at: string;
  updated_at?: string;
};

export type Consultation = {
  id: string;
  patient_id: string;
  medecin_id: string;
  motif: string;
  diagnostic: string | null;
  tension: string | null;
  temperature: number | null;
  poids: number | null;
  traitement: string | null;
  notes: string | null;
  clinical_data?: import("./consultation-clinical").ConsultationClinicalData | null;
  status: "EN_ATTENTE" | "EN_COURS" | "TERMINEE" | "ANNULEE";
  date_consultation: string;
  created_at: string;
  patients?: Pick<Patient, "nom" | "prenom" | "numero_dossier"> | null;
  profiles?: Pick<Profile, "first_name" | "last_name"> | null;
};

export type Payment = {
  id: string;
  patient_id: string;
  collected_by: string | null;
  montant: number;
  type: string;
  mode_paiement: "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "INSURANCE";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  service_id: string | null;
  service_type: string | null;
  created_at: string;
  patients?: Pick<Patient, "nom" | "prenom" | "numero_dossier"> | null;
};

export type Medication = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  threshold: number;
  expiry_date: string | null;
  supplier_id: string | null;
  batch_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_by: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles?: Pick<Profile, "first_name" | "last_name"> | null;
};

export type Notification = {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  module: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type CenterSetting = {
  id: string;
  key: string;
  value: string | null;
  category: string;
  updated_at: string;
};

export type Reception = {
  id: string;
  patient_id: string;
  received_by: string | null;
  motif: string;
  service_destine: string;
  priorite: ExamPriority;
  status: ServiceStatus;
  notes: string | null;
  date_reception: string;
  created_at: string;
  patients?: Pick<Patient, "nom" | "prenom" | "numero_dossier"> | null;
};

export type AppointmentStatus = "PLANIFIE" | "CONFIRME" | "REALISE" | "ANNULE" | "ABSENT";

export type Appointment = {
  id: string;
  patient_id: string;
  medecin_id: string;
  date_rdv: string;
  duree_minutes: number;
  type_rdv: string;
  motif: string;
  statut: AppointmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  patients?: Pick<Patient, "nom" | "prenom" | "numero_dossier"> | null;
  medecin?: Pick<Profile, "first_name" | "last_name"> | null;
};

export type ServiceRecord = {
  id: string;
  patient_id: string;
  status: ServiceStatus;
  montant: number;
  notes: string | null;
  created_at: string;
  patients?: Pick<Patient, "nom" | "prenom" | "numero_dossier"> | null;
};

export type LaboratoryExam = ServiceRecord & {
  type_examen: string;
  resultats: string | null;
  prescripteur_id: string | null;
  technicien_id: string | null;
  priorite: ExamPriority;
  date_prescription: string;
  date_resultat: string | null;
};

export type EgExam = ServiceRecord & {
  type_examen: string;
  resultats: string | null;
  prescripteur_id: string | null;
  technicien_id: string | null;
  date_examen: string;
};

export type EcgExam = ServiceRecord & {
  type_examen: string;
  resultats: string | null;
  frequence_cardiaque: number | null;
  prescripteur_id: string | null;
  technicien_id: string | null;
  date_examen: string;
};

export type RadiologyExam = ServiceRecord & {
  type_examen: string;
  zone_anatomique: string | null;
  resultats: string | null;
  prescripteur_id: string | null;
  radiologue_id: string | null;
  date_examen: string;
};

export type KinesitherapieSession = ServiceRecord & {
  type_seance: string;
  objectifs: string | null;
  exercices: string | null;
  evaluation_douleur: number | null;
  kinesitherapeute_id: string | null;
  date_seance: string;
  duree_minutes: number;
};

export type Surgery = ServiceRecord & {
  type_intervention: string;
  diagnostic_preop: string | null;
  procedure: string | null;
  salle: string | null;
  chirurgien_id: string | null;
  date_intervention: string;
  duree_minutes: number | null;
};

export type Hospitalization = {
  id: string;
  patient_id: string;
  medecin_id: string | null;
  chambre: string | null;
  lit: string | null;
  motif_admission: string;
  diagnostic: string | null;
  status: ServiceStatus;
  montant_journalier: number;
  date_admission: string;
  date_sortie: string | null;
  notes: string | null;
  created_at: string;
  patients?: Pick<Patient, "nom" | "prenom" | "numero_dossier"> | null;
};

export type NursingCare = ServiceRecord & {
  type_soin: string;
  description: string | null;
  infirmier_id: string | null;
  date_soin: string;
};

export type Plaster = ServiceRecord & {
  zone_corps: string;
  type_platre: string;
  praticien_id: string | null;
  date_pose: string;
  date_retrait: string | null;
};

export type Dressing = ServiceRecord & {
  zone_corps: string;
  type_pansement: string;
  praticien_id: string | null;
  date_pansement: string;
  prochain_pansement: string | null;
};

export type PharmacySupplier = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
};

export type PharmacyPurchase = {
  id: string;
  supplier_id: string | null;
  medication_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_date: string;
  invoice_number: string | null;
  created_by: string | null;
  created_at: string;
};

export type Backup = {
  id: string;
  filename: string;
  size_bytes: number | null;
  status: string;
  created_by: string | null;
  created_at: string;
};

export type UserActivity = {
  id: string;
  user_id: string;
  action: string;
  module: string;
  details: string | null;
  created_at: string;
};

export type ModuleKey =
  | "dashboard"
  | "reception"
  | "patients"
  | "consultations"
  | "perception"
  | "laboratoire"
  | "eg"
  | "ecg"
  | "radiologie"
  | "kinesitherapie"
  | "chirurgie"
  | "hospitalisation"
  | "soins_infirmiers"
  | "plâtres"
  | "pansements"
  | "pharmacie"
  | "comptabilite"
  | "rapports"
  | "impression"
  | "administration"
  | "parametres"
  | "profil"
  | "sauvegardes"
  | "audit"
  | "sante_systeme"
  | "historique"
  | "activites"
  | "file_transfers"
  | "messaging"
  | "doctor_results";

export type Permission = {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type RolePermission = {
  id: string;
  role: UserRole;
  module: ModuleKey;
} & Permission;
