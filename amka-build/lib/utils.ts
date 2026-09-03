import type { Consultation, Payment, UserRole } from "./types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-CD", {
    style: "currency",
    currency: "CDF",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d);
  } catch {
    return "-";
  }
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
  } catch {
    return "-";
  }
}

export function displayRole(role?: UserRole | null) {
  const labels: Record<UserRole, string> = {
    ADMIN: "Administrateur",
    RECEPTIONIST: "Réceptionniste",
    MEDECIN_DIRECTEUR: "Médecin Directeur",
    MEDECIN_1: "Médecin 1",
    MEDECIN_2: "Médecin 2",
    MEDECIN_3: "Médecin 3",
    MEDECIN_4: "Médecin 4",
    PERCEPTEUR: "Perceptrice",
    PHARMACIEN: "Pharmacien",
    COMPTABLE: "Comptable",
    ORTHOPEDISTE: "Orthopédiste",
    PSYCHIATRE: "Psychiatre",
    LABORANTIN: "Laborantin",
    TECHNICIEN_EG: "Technicien EG",
    TECHNICIEN_ECG: "Technicien ECG",
    RADIOLOGUE: "Radiologue",
    KINESITHERAPEUTE: "Kinésithérapeute",
    CHIRURGIEN: "Chirurgien",
    INFIRMIER: "Infirmier",
    CAISSIER: "Caissier",
  };
  return labels[role as UserRole] || (role ? String(role) : "Rôle inconnu");
}

export function serviceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    EN_ATTENTE: "En attente",
    EN_COURS: "En cours",
    TERMINE: "Terminé",
    ANNULE: "Annulé",
  };
  return labels[status] ?? status;
}

export function consultationLabel(status: Consultation["status"]) {
  const labels: Record<Consultation["status"], string> = {
    EN_ATTENTE: "En attente",
    EN_COURS: "En cours",
    TERMINEE: "Terminee",
    ANNULEE: "Annulee"
  };
  return labels[status];
}

export function paymentLabel(status: Payment["status"]) {
  const labels: Record<Payment["status"], string> = {
    PENDING: "En attente",
    COMPLETED: "Complete",
    CANCELLED: "Annule"
  };
  return labels[status];
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function initials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "AM";
}
