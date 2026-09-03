import type { UserRole } from "./types";
import { displayRole } from "./utils";

export const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "RECEPTIONIST",
  "PERCEPTEUR",
  "MEDECIN_DIRECTEUR",
  "MEDECIN_1",
  "MEDECIN_2",
  "MEDECIN_3",
  "ORTHOPEDISTE",
  "PSYCHIATRE",
  "LABORANTIN",
  "TECHNICIEN_EG",
  "TECHNICIEN_ECG",
  "RADIOLOGUE",
  "KINESITHERAPEUTE",
  "CHIRURGIEN",
  "INFIRMIER",
  "PHARMACIEN",
  "COMPTABLE",
  "CAISSIER",
];

/** Tous les rôles disponibles à l'inscription. */
export const REGISTRABLE_ROLES: UserRole[] = ALL_ROLES;

export function roleOptions(roles: UserRole[] = ALL_ROLES) {
  return roles.map((r) => ({ value: r, label: displayRole(r) }));
}
