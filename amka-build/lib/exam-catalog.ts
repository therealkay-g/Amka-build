import type { ExamCategoryWithExams, Exam } from "@/lib/exam-types";

const UUID_NAMESPACE = "00000000-0000-0000-0000-000000000000";

export function toUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
  const h = Array.from(id).reduce((s, c, i) => s + (c.charCodeAt(0) + i * 7).toString(16).padStart(2, "0"), "").slice(0, 32).padEnd(32, "0");
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

export const DEFAULT_EXAM_CATALOG: ExamCategoryWithExams[] = [
  {
    id: "cat-lab",
    name: "Laboratoire",
    description: "Analyses et examens biologiques",
    icon: "FlaskConical",
    display_order: 1,
    is_active: true,
    created_at: "",
    exams: [
      { id: "ex-nfs", category_id: "cat-lab", name: "NFS (Hémogramme)", subcategory: "Hématologie", is_active: true, display_order: 1, created_at: "" },
      { id: "ex-gb", category_id: "cat-lab", name: "GB (Numération des globules blancs)", subcategory: "Hématologie", is_active: true, display_order: 2, created_at: "" },
      { id: "ex-gr", category_id: "cat-lab", name: "GR (Numération des globules rouges)", subcategory: "Hématologie", is_active: true, display_order: 3, created_at: "" },
      { id: "ex-plaq", category_id: "cat-lab", name: "Plaquettes", subcategory: "Hématologie", is_active: true, display_order: 4, created_at: "" },
      { id: "ex-hct", category_id: "cat-lab", name: "Hématocrite", subcategory: "Hématologie", is_active: true, display_order: 5, created_at: "" },
      { id: "ex-vs", category_id: "cat-lab", name: "VS", subcategory: "Hématologie", is_active: true, display_order: 6, created_at: "" },
      { id: "ex-sedim", category_id: "cat-lab", name: "Sédiment urinaire", subcategory: "Hématologie", is_active: true, display_order: 7, created_at: "" },
      { id: "ex-gepaisse", category_id: "cat-lab", name: "Goutte épaisse", subcategory: "Hématologie", is_active: true, display_order: 8, created_at: "" },
      { id: "ex-gfraiche", category_id: "cat-lab", name: "Goutte fraîche", subcategory: "Hématologie", is_active: true, display_order: 9, created_at: "" },
      { id: "ex-scarif", category_id: "cat-lab", name: "Scarification de filaire", subcategory: "Hématologie", is_active: true, display_order: 10, created_at: "" },
      { id: "ex-ts", category_id: "cat-lab", name: "Temps de saignement", subcategory: "Hématologie", is_active: true, display_order: 11, created_at: "" },
      { id: "ex-tcoag", category_id: "cat-lab", name: "Temps de coagulation", subcategory: "Hématologie", is_active: true, display_order: 12, created_at: "" },
      { id: "ex-groupage", category_id: "cat-lab", name: "Groupage sanguin", subcategory: "Hématologie", is_active: true, display_order: 13, created_at: "" },
      { id: "ex-emmel", category_id: "cat-lab", name: "Test d'Emmel", subcategory: "Hématologie", is_active: true, display_order: 14, created_at: "" },
      { id: "ex-also", category_id: "cat-lab", name: "ALSO", subcategory: "Sérologie", is_active: true, display_order: 15, created_at: "" },
      { id: "ex-fr", category_id: "cat-lab", name: "Facteur rhumatoïde", subcategory: "Sérologie", is_active: true, display_order: 16, created_at: "" },
      { id: "ex-crp", category_id: "cat-lab", name: "CRP", subcategory: "Sérologie", is_active: true, display_order: 17, created_at: "" },
      { id: "ex-hepc", category_id: "cat-lab", name: "Hépatite C Anticorps", subcategory: "Sérologie", is_active: true, display_order: 18, created_at: "" },
      { id: "ex-hepb", category_id: "cat-lab", name: "Hépatite B Anticorps", subcategory: "Sérologie", is_active: true, display_order: 19, created_at: "" },
      { id: "ex-gold", category_id: "cat-lab", name: "In Gold", subcategory: "Sérologie", is_active: true, display_order: 20, created_at: "" },
      { id: "ex-hpylori-ab", category_id: "cat-lab", name: "H-Pylori Anticorps", subcategory: "Sérologie", is_active: true, display_order: 21, created_at: "" },
      { id: "ex-hpylori-ag", category_id: "cat-lab", name: "H-Pylori Antigène", subcategory: "Sérologie", is_active: true, display_order: 22, created_at: "" },
      { id: "ex-rpr", category_id: "cat-lab", name: "RPR", subcategory: "Sérologie", is_active: true, display_order: 23, created_at: "" },
      { id: "ex-widal", category_id: "cat-lab", name: "Widal", subcategory: "Sérologie", is_active: true, display_order: 24, created_at: "" },
      { id: "ex-acide", category_id: "cat-lab", name: "Acide urique", subcategory: "Biochimie", is_active: true, display_order: 25, created_at: "" },
      { id: "ex-asat", category_id: "cat-lab", name: "ASAT", subcategory: "Biochimie", is_active: true, display_order: 26, created_at: "" },
      { id: "ex-alat", category_id: "cat-lab", name: "ALAT", subcategory: "Biochimie", is_active: true, display_order: 27, created_at: "" },
      { id: "ex-uree", category_id: "cat-lab", name: "Urée", subcategory: "Biochimie", is_active: true, display_order: 28, created_at: "" },
      { id: "ex-creat", category_id: "cat-lab", name: "Créatinine", subcategory: "Biochimie", is_active: true, display_order: 29, created_at: "" },
      { id: "ex-chol", category_id: "cat-lab", name: "Cholestérol total", subcategory: "Biochimie", is_active: true, display_order: 30, created_at: "" },
      { id: "ex-hdl", category_id: "cat-lab", name: "HDL", subcategory: "Biochimie", is_active: true, display_order: 31, created_at: "" },
      { id: "ex-ldl", category_id: "cat-lab", name: "LDL", subcategory: "Biochimie", is_active: true, display_order: 32, created_at: "" },
      { id: "ex-trigly", category_id: "cat-lab", name: "Triglycérides", subcategory: "Biochimie", is_active: true, display_order: 33, created_at: "" },
      { id: "ex-biltot", category_id: "cat-lab", name: "Bilirubine totale", subcategory: "Biochimie", is_active: true, display_order: 34, created_at: "" },
      { id: "ex-bildir", category_id: "cat-lab", name: "Bilirubine directe", subcategory: "Biochimie", is_active: true, display_order: 35, created_at: "" },
      { id: "ex-pal", category_id: "cat-lab", name: "Phosphatase alcaline", subcategory: "Biochimie", is_active: true, display_order: 36, created_at: "" },
      { id: "ex-iono", category_id: "cat-lab", name: "Ionogramme", subcategory: "Biochimie", is_active: true, display_order: 37, created_at: "" },
      { id: "ex-ggtp", category_id: "cat-lab", name: "Gamma GT", subcategory: "Biochimie", is_active: true, display_order: 38, created_at: "" },
    ],
  },
  {
    id: "cat-rad",
    name: "Radiologie",
    description: "Imagerie médicale",
    icon: "ScanLine",
    display_order: 2,
    is_active: true,
    created_at: "",
    exams: [
      { id: "ex-rad-1", category_id: "cat-rad", name: "Radiographie Thorax", subcategory: null, is_active: true, display_order: 1, created_at: "" },
      { id: "ex-rad-2", category_id: "cat-rad", name: "Radiographie Membre supérieur", subcategory: null, is_active: true, display_order: 2, created_at: "" },
      { id: "ex-rad-3", category_id: "cat-rad", name: "Radiographie Membre inférieur", subcategory: null, is_active: true, display_order: 3, created_at: "" },
      { id: "ex-rad-4", category_id: "cat-rad", name: "Radiographie Rachis", subcategory: null, is_active: true, display_order: 4, created_at: "" },
      { id: "ex-rad-5", category_id: "cat-rad", name: "Radiographie Bassin", subcategory: null, is_active: true, display_order: 5, created_at: "" },
      { id: "ex-rad-6", category_id: "cat-rad", name: "Échographie abdominale", subcategory: null, is_active: true, display_order: 6, created_at: "" },
      { id: "ex-rad-7", category_id: "cat-rad", name: "Échographie pelvienne", subcategory: null, is_active: true, display_order: 7, created_at: "" },
      { id: "ex-rad-8", category_id: "cat-rad", name: "Échographie obstétricale", subcategory: null, is_active: true, display_order: 8, created_at: "" },
      { id: "ex-rad-9", category_id: "cat-rad", name: "Scanner (TDM)", subcategory: null, is_active: true, display_order: 9, created_at: "" },
      { id: "ex-rad-10", category_id: "cat-rad", name: "IRM", subcategory: null, is_active: true, display_order: 10, created_at: "" },
      { id: "ex-rad-11", category_id: "cat-rad", name: "Mammographie", subcategory: null, is_active: true, display_order: 11, created_at: "" },
      { id: "ex-rad-12", category_id: "cat-rad", name: "Arthrographie", subcategory: null, is_active: true, display_order: 12, created_at: "" },
      { id: "ex-rad-13", category_id: "cat-rad", name: "Myélographie", subcategory: null, is_active: true, display_order: 13, created_at: "" },
    ],
  },
  {
    id: "cat-ecg",
    name: "ECG",
    description: "Électrocardiogramme",
    icon: "Activity",
    display_order: 3,
    is_active: true,
    created_at: "",
    exams: [
      { id: "ex-ecg-1", category_id: "cat-ecg", name: "ECG", subcategory: null, is_active: true, display_order: 1, created_at: "" },
      { id: "ex-ecg-2", category_id: "cat-ecg", name: "ECG d'effort", subcategory: null, is_active: true, display_order: 2, created_at: "" },
      { id: "ex-ecg-3", category_id: "cat-ecg", name: "ECG Holter (24h)", subcategory: null, is_active: true, display_order: 3, created_at: "" },
    ],
  },
  {
    id: "cat-eeg",
    name: "EEG",
    description: "Électroencéphalogramme",
    icon: "Brain",
    display_order: 4,
    is_active: true,
    created_at: "",
    exams: [
      { id: "ex-eeg-1", category_id: "cat-eeg", name: "EEG de repos", subcategory: null, is_active: true, display_order: 1, created_at: "" },
      { id: "ex-eeg-2", category_id: "cat-eeg", name: "EEG d'éveil", subcategory: null, is_active: true, display_order: 2, created_at: "" },
      { id: "ex-eeg-3", category_id: "cat-eeg", name: "EEG prolongé (24h)", subcategory: null, is_active: true, display_order: 3, created_at: "" },
      { id: "ex-eeg-4", category_id: "cat-eeg", name: "EEG avec activation", subcategory: null, is_active: true, display_order: 4, created_at: "" },
    ],
  },
];

export function groupExamsBySubcategory(exams: Exam[]): Record<string, Exam[]> {
  const groups: Record<string, Exam[]> = {};
  for (const exam of exams) {
    const key = exam.subcategory || "_default_";
    if (!groups[key]) groups[key] = [];
    groups[key].push(exam);
  }
  return groups;
}
