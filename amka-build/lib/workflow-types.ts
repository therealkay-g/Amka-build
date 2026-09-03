import type { Patient, Profile, Consultation } from "./types";

export type MedicalActType = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PrescribedItem = {
  id: string;
  consultation_id: string;
  patient_id: string;
  prescribed_by: string;
  item_type: 'medical_act' | 'medication';
  item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  dosage: string | null;
  posology: string | null;
  duration: string | null;
  notes: string | null;
  status: PrescribedItemStatus;
  created_at: string;
  updated_at: string;
  patient?: Patient | null;
  prescribed_by_profile?: Profile | null;
};

export type PrescribedItemStatus =
  | 'PRESCRIT'
  | 'EN_ATTENTE_PAIEMENT'
  | 'PAYE'
  | 'EN_ATTENTE_EXECUTION'
  | 'EN_COURS'
  | 'TERMINE'
  | 'VALIDE'
  | 'ANNULE';

export type PrescribedItemHistory = {
  id: string;
  prescribed_item_id: string;
  from_status: string | null;
  to_status: PrescribedItemStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  changed_by_profile?: Profile | null;
};

export type PrescriptionBill = {
  id: string;
  bill_number: string;
  consultation_id: string | null;
  patient_id: string;
  billed_by: string | null;
  total_amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient | null;
  consultation?: Consultation | null;
  items?: PrescriptionBillItem[];
};

export type PrescriptionBillItem = {
  id: string;
  bill_id: string;
  prescribed_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
};

export type ServiceRequest = {
  id: string;
  prescribed_item_id: string;
  patient_id: string;
  consultation_id: string | null;
  bill_id: string | null;
  service_type: ServiceType;
  status: ServiceRequestStatus;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient | null;
  prescribed_item?: PrescribedItem | null;
  assigned_to_profile?: Profile | null;
};

export type ServiceType =
  | 'HOSPITALISATION'
  | 'SOINS_INFIRMIERS'
  | 'PANSEMENT'
  | 'PLATRE'
  | 'CHIRURGIE'
  | 'INFILTRATION';

export type ServiceRequestStatus =
  | 'EN_ATTENTE'
  | 'ACCEPTE'
  | 'EN_COURS'
  | 'TERMINE'
  | 'VALIDE'
  | 'ANNULE';

export type PharmacyRequest = {
  id: string;
  prescribed_item_id: string;
  patient_id: string;
  consultation_id: string | null;
  bill_id: string | null;
  status: PharmacyRequestStatus;
  dispensed_by: string | null;
  notes: string | null;
  dispensed_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient | null;
  prescribed_item?: PrescribedItem | null;
  dispensation?: PharmacyDispensation | null;
};

export type PharmacyRequestStatus =
  | 'EN_ATTENTE'
  | 'EN_PREPARATION'
  | 'DELIVRE'
  | 'ANNULE';

export type PharmacyDispensation = {
  id: string;
  pharmacy_request_id: string;
  medication_id: string;
  quantity_dispensed: number;
  batch_number: string | null;
  expiry_date: string | null;
  created_at: string;
  dispensed_by: string;
  dispensed_by_profile?: Profile | null;
};

export const PRESCRIBED_ITEM_STATUS_LABELS: Record<PrescribedItemStatus, string> = {
  PRESCRIT: 'Prescrit',
  EN_ATTENTE_PAIEMENT: 'En attente de paiement',
  PAYE: 'Payé',
  EN_ATTENTE_EXECUTION: 'En attente d\'exécution',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  VALIDE: 'Validé',
  ANNULE: 'Annulé',
};

export const PRESCRIBED_ITEM_STATUS_COLORS: Record<PrescribedItemStatus, string> = {
  PRESCRIT: 'bg-gray-100 text-gray-700',
  EN_ATTENTE_PAIEMENT: 'bg-yellow-100 text-yellow-800',
  PAYE: 'bg-blue-100 text-blue-800',
  EN_ATTENTE_EXECUTION: 'bg-purple-100 text-purple-800',
  EN_COURS: 'bg-orange-100 text-orange-800',
  TERMINE: 'bg-green-100 text-green-800',
  VALIDE: 'bg-indigo-100 text-indigo-800',
  ANNULE: 'bg-red-100 text-red-800',
};

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTE: 'Accepté',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  VALIDE: 'Validé',
  ANNULE: 'Annulé',
};

export const SERVICE_REQUEST_STATUS_COLORS: Record<ServiceRequestStatus, string> = {
  EN_ATTENTE: 'bg-gray-100 text-gray-700',
  ACCEPTE: 'bg-blue-100 text-blue-800',
  EN_COURS: 'bg-orange-100 text-orange-800',
  TERMINE: 'bg-green-100 text-green-800',
  VALIDE: 'bg-indigo-100 text-indigo-800',
  ANNULE: 'bg-red-100 text-red-800',
};

export const PHARMACY_REQUEST_STATUS_LABELS: Record<PharmacyRequestStatus, string> = {
  EN_ATTENTE: 'En attente',
  EN_PREPARATION: 'En préparation',
  DELIVRE: 'Délivré',
  ANNULE: 'Annulé',
};

export const PHARMACY_REQUEST_STATUS_COLORS: Record<PharmacyRequestStatus, string> = {
  EN_ATTENTE: 'bg-gray-100 text-gray-700',
  EN_PREPARATION: 'bg-blue-100 text-blue-800',
  DELIVRE: 'bg-green-100 text-green-800',
  ANNULE: 'bg-red-100 text-red-800',
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  HOSPITALISATION: 'Hospitalisation',
  SOINS_INFIRMIERS: 'Soins infirmiers',
  PANSEMENT: 'Pansement',
  PLATRE: 'Plâtre',
  CHIRURGIE: 'Chirurgie',
  INFILTRATION: 'Infiltration',
};

export const SERVICE_TYPE_ICONS: Record<ServiceType, string> = {
  HOSPITALISATION: 'Building2',
  SOINS_INFIRMIERS: 'HeartPulse',
  PANSEMENT: 'Bandage',
  PLATRE: 'Bone',
  CHIRURGIE: 'Scalpel',
  INFILTRATION: 'Activity',
};