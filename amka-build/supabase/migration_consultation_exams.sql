-- Migration: Examens complémentaires pour consultations
-- Crée le catalogue d'examens et la table de jonction consultation_exams

-- Table des catégories d'examens
CREATE TABLE IF NOT EXISTS exam_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  icon text,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Table des examens (catalogue)
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES exam_categories(id) NOT NULL,
  name text NOT NULL,
  subcategory text,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Table de jonction consultation ↔ examens
CREATE TABLE IF NOT EXISTS consultation_exams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  exam_id uuid REFERENCES exams(id) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(consultation_id, exam_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_consultation_exams_consultation ON consultation_exams(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_exams_exam ON consultation_exams(exam_id);
CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category_id);

-- RLS
ALTER TABLE exam_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_exams ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['exam_categories', 'exams', 'consultation_exams'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_' || t AND tablename = t) THEN
      EXECUTE format('CREATE POLICY "auth_%s" ON %I FOR ALL USING (auth.role()=''authenticated'')', t, t);
    END IF;
  END LOOP;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE consultation_exams;

-- Insertion du catalogue de base

-- Catégorie: Laboratoire
INSERT INTO exam_categories (name, description, icon, display_order) VALUES
  ('Laboratoire', 'Analyses et examens biologiques', 'FlaskConical', 1)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE lab_id uuid;
BEGIN
  SELECT id INTO lab_id FROM exam_categories WHERE name = 'Laboratoire';

  -- Hématologie
  INSERT INTO exams (category_id, name, subcategory, display_order) VALUES
    (lab_id, 'NFS (Hémogramme)', 'Hématologie', 1),
    (lab_id, 'GB (Numération des globules blancs)', 'Hématologie', 2),
    (lab_id, 'GR (Numération des globules rouges)', 'Hématologie', 3),
    (lab_id, 'Plaquettes', 'Hématologie', 4),
    (lab_id, 'Hématocrite', 'Hématologie', 5),
    (lab_id, 'VS', 'Hématologie', 6),
    (lab_id, 'Sédiment urinaire', 'Hématologie', 7),
    (lab_id, 'Goutte épaisse', 'Hématologie', 8),
    (lab_id, 'Goutte fraîche', 'Hématologie', 9),
    (lab_id, 'Scarification de filaire', 'Hématologie', 10),
    (lab_id, 'Temps de saignement', 'Hématologie', 11),
    (lab_id, 'Temps de coagulation', 'Hématologie', 12),
    (lab_id, 'Groupage sanguin', 'Hématologie', 13),
    (lab_id, 'Test d''Emmel', 'Hématologie', 14)
  ON CONFLICT (category_id, name) DO NOTHING;

  -- Sérologie
  INSERT INTO exams (category_id, name, subcategory, display_order) VALUES
    (lab_id, 'ALSO', 'Sérologie', 15),
    (lab_id, 'Facteur rhumatoïde', 'Sérologie', 16),
    (lab_id, 'CRP', 'Sérologie', 17),
    (lab_id, 'Hépatite C Anticorps', 'Sérologie', 18),
    (lab_id, 'Hépatite B Anticorps', 'Sérologie', 19),
    (lab_id, 'In Gold', 'Sérologie', 20),
    (lab_id, 'H-Pylori Anticorps', 'Sérologie', 21),
    (lab_id, 'H-Pylori Antigène', 'Sérologie', 22),
    (lab_id, 'RPR', 'Sérologie', 23),
    (lab_id, 'Widal', 'Sérologie', 24)
  ON CONFLICT (category_id, name) DO NOTHING;

  -- Biochimie
  INSERT INTO exams (category_id, name, subcategory, display_order) VALUES
    (lab_id, 'Acide urique', 'Biochimie', 25),
    (lab_id, 'ASAT', 'Biochimie', 26),
    (lab_id, 'ALAT', 'Biochimie', 27),
    (lab_id, 'Urée', 'Biochimie', 28),
    (lab_id, 'Créatinine', 'Biochimie', 29),
    (lab_id, 'Cholestérol total', 'Biochimie', 30),
    (lab_id, 'HDL', 'Biochimie', 31),
    (lab_id, 'LDL', 'Biochimie', 32),
    (lab_id, 'Triglycérides', 'Biochimie', 33),
    (lab_id, 'Bilirubine totale', 'Biochimie', 34),
    (lab_id, 'Bilirubine directe', 'Biochimie', 35),
    (lab_id, 'Phosphatase alcaline', 'Biochimie', 36),
    (lab_id, 'Ionogramme', 'Biochimie', 37),
    (lab_id, 'Gamma GT', 'Biochimie', 38)
  ON CONFLICT (category_id, name) DO NOTHING;
END $$;

-- Catégorie: Radiologie
INSERT INTO exam_categories (name, description, icon, display_order) VALUES
  ('Radiologie', 'Imagerie médicale', 'ScanLine', 2)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE rad_id uuid;
BEGIN
  SELECT id INTO rad_id FROM exam_categories WHERE name = 'Radiologie';
  INSERT INTO exams (category_id, name, subcategory, display_order) VALUES
    (rad_id, 'Radiographie Thorax', NULL, 1),
    (rad_id, 'Radiographie Membre supérieur', NULL, 2),
    (rad_id, 'Radiographie Membre inférieur', NULL, 3),
    (rad_id, 'Radiographie Rachis', NULL, 4),
    (rad_id, 'Radiographie Bassin', NULL, 5),
    (rad_id, 'Échographie abdominale', NULL, 6),
    (rad_id, 'Échographie pelvienne', NULL, 7),
    (rad_id, 'Échographie obstétricale', NULL, 8),
    (rad_id, 'Scanner (TDM)', NULL, 9),
    (rad_id, 'IRM', NULL, 10),
    (rad_id, 'Mammographie', NULL, 11),
    (rad_id, 'Arthrographie', NULL, 12),
    (rad_id, 'Myélographie', NULL, 13)
  ON CONFLICT (category_id, name) DO NOTHING;
END $$;

-- Catégorie: ECG
INSERT INTO exam_categories (name, description, icon, display_order) VALUES
  ('ECG', 'Électrocardiogramme', 'Activity', 3)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE ecg_id uuid;
BEGIN
  SELECT id INTO ecg_id FROM exam_categories WHERE name = 'ECG';
  INSERT INTO exams (category_id, name, subcategory, display_order) VALUES
    (ecg_id, 'ECG', NULL, 1),
    (ecg_id, 'ECG d''effort', NULL, 2),
    (ecg_id, 'ECG Holter (24h)', NULL, 3)
  ON CONFLICT (category_id, name) DO NOTHING;
END $$;

-- Catégorie: EEG
INSERT INTO exam_categories (name, description, icon, display_order) VALUES
  ('EEG', 'Électroencéphalogramme', 'Brain', 4)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE eeg_id uuid;
BEGIN
  SELECT id INTO eeg_id FROM exam_categories WHERE name = 'EEG';
  INSERT INTO exams (category_id, name, subcategory, display_order) VALUES
    (eeg_id, 'EEG de repos', NULL, 1),
    (eeg_id, 'EEG d''éveil', NULL, 2),
    (eeg_id, 'EEG prolongé (24h)', NULL, 3),
    (eeg_id, 'EEG avec activation', NULL, 4)
  ON CONFLICT (category_id, name) DO NOTHING;
END $$;
