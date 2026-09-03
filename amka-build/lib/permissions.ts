import type { ModuleKey, Permission, UserRole } from "./types";

export const ALL_MODULES: ModuleKey[] = [
  "dashboard",
  "reception",
  "patients",
  "consultations",
  "perception",
  "laboratoire",
  "eg",
  "ecg",
  "radiologie",
  "kinesitherapie",
  "chirurgie",
  "hospitalisation",
  "soins_infirmiers",
  "plâtres",
  "pansements",
  "pharmacie",
  "comptabilite",
  "rapports",
  "impression",
  "administration",
  "parametres",
  "profil",
  "sauvegardes",
  "audit",
  "sante_systeme",
  "historique",
  "activites",
  "file_transfers",
  "messaging",
];

const full: Permission = { can_view: true, can_create: true, can_edit: true, can_delete: true };
const noAccess: Permission = { can_view: false, can_create: false, can_edit: false, can_delete: false };

const bonus = {
  profil: full,
  parametres: full,
  file_transfers: full,
  messaging: full,
};

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Partial<Record<ModuleKey, Permission>>> = {
  ADMIN: Object.fromEntries(ALL_MODULES.map((m) => [m, full])) as Record<ModuleKey, Permission>,

  RECEPTIONIST: {
    reception: full,
    ...bonus,
  },

  PERCEPTEUR: {
    perception: full,
    ...bonus,
  },

  MEDECIN_DIRECTEUR: {
    dashboard: full,
    consultations: full,
    rapports: full,
    ...bonus,
  },

  MEDECIN_1: {
    consultations: full,
    ...bonus,
  },

  MEDECIN_2: {
    consultations: full,
    ...bonus,
  },

  MEDECIN_3: {
    consultations: full,
    ...bonus,
  },

  MEDECIN_4: {
    consultations: full,
    ...bonus,
  },

  ORTHOPEDISTE: {
    consultations: full,
    kinesitherapie: full,
    plâtres: full,
    ...bonus,
  },

  PSYCHIATRE: {
    consultations: full,
    ...bonus,
  },

  LABORANTIN: {
    laboratoire: full,
    ...bonus,
  },

  TECHNICIEN_EG: {
    eg: full,
    ...bonus,
  },

  TECHNICIEN_ECG: {
    ecg: full,
    ...bonus,
  },

  RADIOLOGUE: {
    radiologie: full,
    ...bonus,
  },

  KINESITHERAPEUTE: {
    kinesitherapie: full,
    ...bonus,
  },

  CHIRURGIEN: {
    chirurgie: full,
    ...bonus,
  },

  INFIRMIER: {
    soins_infirmiers: full,
    pansements: full,
    ...bonus,
  },

  PHARMACIEN: {
    pharmacie: full,
    ...bonus,
  },

  COMPTABLE: {
    comptabilite: full,
    rapports: full,
    ...bonus,
  },

  CAISSIER: {
    comptabilite: full,
    rapports: full,
    ...bonus,
  },
};

export function getPermission(role: UserRole | null | undefined, module: ModuleKey): Permission {
  if (!role) return noAccess;
  const rolePerms = DEFAULT_ROLE_PERMISSIONS[role];
  if (!rolePerms) return noAccess;
  return rolePerms[module] ?? noAccess;
}

export function canAccess(role: UserRole | null | undefined, module: ModuleKey): boolean {
  return getPermission(role, module).can_view;
}

export function canCreate(role: UserRole | null | undefined, module: ModuleKey): boolean {
  return getPermission(role, module).can_create;
}

export function canEdit(role: UserRole | null | undefined, module: ModuleKey): boolean {
  return getPermission(role, module).can_edit;
}

export function canDelete(role: UserRole | null | undefined, module: ModuleKey): boolean {
  return getPermission(role, module).can_delete;
}

export function getDefaultRouteForRole(role: UserRole | null | undefined): string {
  if (!role) return "/login";
  if (canAccess(role, "dashboard")) return "/dashboard";
  if (canAccess(role, "consultations")) return "/consultations";
  if (canAccess(role, "reception")) return "/reception";
  if (canAccess(role, "perception")) return "/perception";
  if (canAccess(role, "laboratoire")) return "/laboratoire";
  if (canAccess(role, "pharmacie")) return "/pharmacy";
  if (canAccess(role, "comptabilite")) return "/accounting";
  if (canAccess(role, "kinesitherapie")) return "/kinesitherapie";
  if (canAccess(role, "chirurgie")) return "/chirurgie";
  if (canAccess(role, "hospitalisation")) return "/hospitalisation";
  if (canAccess(role, "soins_infirmiers")) return "/soins-infirmiers";
  if (canAccess(role, "radiologie")) return "/radiologie";
  if (canAccess(role, "eg")) return "/eg";
  if (canAccess(role, "ecg")) return "/ecg";
  return "/profil";
}
