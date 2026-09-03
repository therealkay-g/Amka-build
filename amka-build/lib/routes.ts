import type { ModuleKey } from "./types";

export const ROUTE_MODULE_MAP: Record<string, ModuleKey> = {
  "/dashboard": "dashboard",
  "/reception": "reception",
  "/patients": "reception",
  "/consultations": "consultations",
  "/perception": "perception",
  "/payments": "perception",
  "/laboratoire": "laboratoire",
  "/eg": "eg",
  "/ecg": "ecg",
  "/radiologie": "radiologie",
  "/kinesitherapie": "kinesitherapie",
  "/chirurgie": "chirurgie",
  "/hospitalisation": "hospitalisation",
  "/soins-infirmiers": "soins_infirmiers",
  "/platres": "plâtres",
  "/pansements": "pansements",
  "/pharmacy": "pharmacie",
  "/accounting": "comptabilite",
  "/rapports": "rapports",
  "/impression": "impression",
  "/admin": "administration",
  "/users": "administration",
  "/settings": "parametres",
  "/profil": "profil",
  "/sauvegardes": "sauvegardes",
  "/audit": "audit",
  "/sante-systeme": "sante_systeme",
  "/historique": "historique",
  "/activites": "activites",
  "/doctor/results": "doctor_results",
  "/messages": "messaging",
};

export function getModuleForPath(pathname: string): ModuleKey | null {
  if (ROUTE_MODULE_MAP[pathname]) return ROUTE_MODULE_MAP[pathname];
  for (const [route, module] of Object.entries(ROUTE_MODULE_MAP)) {
    if (pathname.startsWith(`${route}/`)) return module;
  }
  return null;
}
