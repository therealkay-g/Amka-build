-- Migration: Workflow facturation et statuts des examens

-- Ajout du prix aux examens du catalogue
ALTER TABLE exams ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;

UPDATE exams SET price = 10 WHERE name = 'NFS (Hémogramme)';
UPDATE exams SET price = 5 WHERE name = 'GB (Numération des globules blancs)';
UPDATE exams SET price = 5 WHERE name = 'GR (Numération des globules rouges)';
UPDATE exams SET price = 5 WHERE name = 'Plaquettes';
UPDATE exams SET price = 5 WHERE name = 'Hématocrite';
UPDATE exams SET price = 4 WHERE name = 'VS';
UPDATE exams SET price = 4 WHERE name = 'Sédiment urinaire';
UPDATE exams SET price = 5 WHERE name = 'Goutte épaisse';
UPDATE exams SET price = 5 WHERE name = 'Goutte fraîche';
UPDATE exams SET price = 8 WHERE name = 'Scarification de filaire';
UPDATE exams SET price = 3 WHERE name = 'Temps de saignement';
UPDATE exams SET price = 3 WHERE name = 'Temps de coagulation';
UPDATE exams SET price = 8 WHERE name = 'Groupage sanguin';
UPDATE exams SET price = 5 WHERE name = 'Test d''Emmel';
UPDATE exams SET price = 8 WHERE name = 'ALSO';
UPDATE exams SET price = 6 WHERE name = 'Facteur rhumatoïde';
UPDATE exams SET price = 8 WHERE name = 'CRP';
UPDATE exams SET price = 12 WHERE name = 'Hépatite C Anticorps';
UPDATE exams SET price = 12 WHERE name = 'Hépatite B Anticorps';
UPDATE exams SET price = 10 WHERE name = 'In Gold';
UPDATE exams SET price = 10 WHERE name = 'H-Pylori Anticorps';
UPDATE exams SET price = 10 WHERE name = 'H-Pylori Antigène';
UPDATE exams SET price = 6 WHERE name = 'RPR';
UPDATE exams SET price = 6 WHERE name = 'Widal';
UPDATE exams SET price = 5 WHERE name = 'Acide urique';
UPDATE exams SET price = 6 WHERE name = 'ASAT';
UPDATE exams SET price = 6 WHERE name = 'ALAT';
UPDATE exams SET price = 5 WHERE name = 'Urée';
UPDATE exams SET price = 6 WHERE name = 'Créatinine';
UPDATE exams SET price = 6 WHERE name = 'Cholestérol total';
UPDATE exams SET price = 6 WHERE name = 'HDL';
UPDATE exams SET price = 6 WHERE name = 'LDL';
UPDATE exams SET price = 6 WHERE name = 'Triglycérides';
UPDATE exams SET price = 6 WHERE name = 'Bilirubine totale';
UPDATE exams SET price = 6 WHERE name = 'Bilirubine directe';
UPDATE exams SET price = 6 WHERE name = 'Phosphatase alcaline';
UPDATE exams SET price = 8 WHERE name = 'Ionogramme';
UPDATE exams SET price = 6 WHERE name = 'Gamma GT';
UPDATE exams SET price = 12 WHERE name = 'Radiographie Thorax';
UPDATE exams SET price = 12 WHERE name = 'Radiographie Membre supérieur';
UPDATE exams SET price = 12 WHERE name = 'Radiographie Membre inférieur';
UPDATE exams SET price = 12 WHERE name = 'Radiographie Rachis';
UPDATE exams SET price = 12 WHERE name = 'Radiographie Bassin';
UPDATE exams SET price = 20 WHERE name = 'Échographie abdominale';
UPDATE exams SET price = 20 WHERE name = 'Échographie pelvienne';
UPDATE exams SET price = 25 WHERE name = 'Échographie obstétricale';
UPDATE exams SET price = 50 WHERE name = 'Scanner (TDM)';
UPDATE exams SET price = 80 WHERE name = 'IRM';
UPDATE exams SET price = 20 WHERE name = 'Mammographie';
UPDATE exams SET price = 15 WHERE name = 'Arthrographie';
UPDATE exams SET price = 25 WHERE name = 'Myélographie';
UPDATE exams SET price = 10 WHERE name = 'ECG';
UPDATE exams SET price = 15 WHERE name = 'ECG d''effort';
UPDATE exams SET price = 25 WHERE name = 'ECG Holter (24h)';
UPDATE exams SET price = 15 WHERE name = 'EEG de repos';
UPDATE exams SET price = 15 WHERE name = 'EEG d''éveil';
UPDATE exams SET price = 25 WHERE name = 'EEG prolongé (24h)';
UPDATE exams SET price = 20 WHERE name = 'EEG avec activation';

-- Ajout du statut workflow à la table de jonction
ALTER TABLE consultation_exams ADD COLUMN IF NOT EXISTS status text DEFAULT 'EN_ATTENTE_PAIEMENT';
ALTER TABLE consultation_exams ADD COLUMN IF NOT EXISTS status_updated_at timestamptz DEFAULT now();
ALTER TABLE consultation_exams ADD COLUMN IF NOT EXISTS invoice_id uuid;
ALTER TABLE consultation_exams ADD COLUMN IF NOT EXISTS results jsonb;
ALTER TABLE consultation_exams ADD COLUMN IF NOT EXISTS resulted_at timestamptz;
ALTER TABLE consultation_exams ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Tables de facturation
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number text UNIQUE NOT NULL,
  consultation_id uuid REFERENCES consultations(id) NOT NULL,
  patient_id uuid REFERENCES patients(id) NOT NULL,
  medecin_id uuid REFERENCES profiles(id),
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'EN_ATTENTE',
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  consultation_exam_id uuid REFERENCES consultation_exams(id),
  exam_id uuid REFERENCES exams(id) NOT NULL,
  exam_name text NOT NULL,
  category_name text NOT NULL,
  quantity int DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Historique des statuts
CREATE TABLE IF NOT EXISTS exam_status_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_exam_id uuid REFERENCES consultation_exams(id) ON DELETE CASCADE NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_consultation_exams_status ON consultation_exams(status);
CREATE INDEX IF NOT EXISTS idx_consultation_exams_invoice ON consultation_exams(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_consultation ON invoices(consultation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_exam_status_history_ce ON exam_status_history(consultation_exam_id);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_status_history ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['invoices', 'invoice_items', 'exam_status_history'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_' || t AND tablename = t) THEN
      EXECUTE format('CREATE POLICY "auth_%s" ON %I FOR ALL USING (auth.role()=''authenticated'')', t, t);
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'invoice_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE invoice_items;
  END IF;
END $$;

-- Fonction pour générer un numéro de facture unique
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  year text;
  seq int;
  num text;
BEGIN
  year := to_char(now(), 'YYYY');
  seq := nextval('invoice_number_seq');
  num := year || '-' || LPAD(seq::text, 4, '0');
  RETURN num;
END;
$$;
