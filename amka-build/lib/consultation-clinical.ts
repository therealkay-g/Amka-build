export type EtatGeneral = "Bon" | "Moyen" | "Altere" | "";

export type ConsultationClinicalData = {
  histoire_maladie: {
    debut_evolution: string;
    antecedents_medicaux: string;
    antecedents_chirurgicaux: string;
    antecedents_psychiatriques: string;
    antecedents_traumatiques: string;
    antecedents_familiaux: string;
    allergies: string;
    traitements_habituelles: string;
  };
  examen_general: {
    ta: string;
    fc: string;
    fr: string;
    temperature: string;
    spo2: string;
    poids: string;
    taille: string;
    imc: string;
    etat_general: EtatGeneral;
  };
  examen_neurologique: {
    conscience_glasgow: string;
    orientation: string;
    langage: string;
    memoire: string;
    paires_craniennes: string;
    force_ms_d: string;
    force_ms_g: string;
    force_mi_d: string;
    force_mi_g: string;
    sensibilite: string;
    rot: string;
    coordination: string;
    equilibre: string;
    marche: string;
    signes_meninges: string;
    sphincters: string;
  };
  examen_psychiatrique: {
    presentation: string;
    comportement: string;
    humeur: string;
    affect: string;
    discours: string;
    pensee: string;
    perceptions: string;
    cognition: string;
    jugement_insight: string;
    risque_suicidaire: string;
  };
  examen_traumatologique: {
    inspection: string;
    deformation: string;
    tumefaction: string;
    eva: string;
    amplitudes_articulaires: string;
    stabilite: string;
    marche_appui: string;
    bilan_fonctionnel: string;
  };
  hors_pharmacie: string;
};

export const EMPTY_CLINICAL_DATA: ConsultationClinicalData = {
  histoire_maladie: {
    debut_evolution: "",
    antecedents_medicaux: "",
    antecedents_chirurgicaux: "",
    antecedents_psychiatriques: "",
    antecedents_traumatiques: "",
    antecedents_familiaux: "",
    allergies: "",
    traitements_habituelles: "",
  },
  examen_general: {
    ta: "",
    fc: "",
    fr: "",
    temperature: "",
    spo2: "",
    poids: "",
    taille: "",
    imc: "",
    etat_general: "",
  },
  examen_neurologique: {
    conscience_glasgow: "",
    orientation: "",
    langage: "",
    memoire: "",
    paires_craniennes: "",
    force_ms_d: "",
    force_ms_g: "",
    force_mi_d: "",
    force_mi_g: "",
    sensibilite: "",
    rot: "",
    coordination: "",
    equilibre: "",
    marche: "",
    signes_meninges: "",
    sphincters: "",
  },
  examen_psychiatrique: {
    presentation: "",
    comportement: "",
    humeur: "",
    affect: "",
    discours: "",
    pensee: "",
    perceptions: "",
    cognition: "",
    jugement_insight: "",
    risque_suicidaire: "",
  },
  examen_traumatologique: {
    inspection: "",
    deformation: "",
    tumefaction: "",
    eva: "",
    amplitudes_articulaires: "",
    stabilite: "",
    marche_appui: "",
    bilan_fonctionnel: "",
  },
  hors_pharmacie: "",
};

export function computeImc(poids: string, taille: string): string {
  const p = parseFloat(poids);
  const t = parseFloat(taille);
  if (!p || !t || t <= 0) return "";
  const imc = p / Math.pow(t / 100, 2);
  return imc.toFixed(1);
}

export function mergeClinicalData(
  raw: unknown,
  legacy?: { tension?: string | null; temperature?: number | null; poids?: number | null }
): ConsultationClinicalData {
  if (!raw || typeof raw !== "object") {
    const base = { ...EMPTY_CLINICAL_DATA };
    if (legacy?.tension) base.examen_general.ta = legacy.tension;
    if (legacy?.temperature) base.examen_general.temperature = String(legacy.temperature);
    if (legacy?.poids) base.examen_general.poids = String(legacy.poids);
    return base;
  }
  const data = raw as Partial<ConsultationClinicalData>;
  const merged: ConsultationClinicalData = {
    histoire_maladie: { ...EMPTY_CLINICAL_DATA.histoire_maladie, ...data.histoire_maladie },
    examen_general: { ...EMPTY_CLINICAL_DATA.examen_general, ...data.examen_general },
    examen_neurologique: { ...EMPTY_CLINICAL_DATA.examen_neurologique, ...data.examen_neurologique },
    examen_psychiatrique: { ...EMPTY_CLINICAL_DATA.examen_psychiatrique, ...data.examen_psychiatrique },
    examen_traumatologique: { ...EMPTY_CLINICAL_DATA.examen_traumatologique, ...data.examen_traumatologique },
    hors_pharmacie: data.hors_pharmacie || "",
  };
  if (legacy?.tension && !merged.examen_general.ta) merged.examen_general.ta = legacy.tension;
  if (legacy?.temperature && !merged.examen_general.temperature) merged.examen_general.temperature = String(legacy.temperature);
  if (legacy?.poids && !merged.examen_general.poids) merged.examen_general.poids = String(legacy.poids);
  merged.examen_general.imc = computeImc(merged.examen_general.poids, merged.examen_general.taille);
  return merged;
}
