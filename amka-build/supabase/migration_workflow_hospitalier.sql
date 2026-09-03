-- Migration: Workflow hospitalier complet (actes médicaux + pharmacie)
-- 1. Types d'actes médicaux avec tarifs configurables
CREATE TABLE IF NOT EXISTS medical_act_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  category text NOT NULL, -- 'HOSPITALISATION', 'SOINS_INFIRMIERS', 'PANSEMENT', 'PLATRE', 'CHIRURGIE'
  price numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Items prescrits (actes ou médicaments) lors d'une consultation
CREATE TABLE IF NOT EXISTS prescribed_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id),
  prescribed_by uuid REFERENCES profiles(id),
  item_type text NOT NULL, -- 'medical_act' | 'medication'
  item_id uuid, -- FK vers medical_act_types ou medications
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  dosage text, -- pour médicaments
  posology text, -- pour médicaments
  duration text, -- pour médicaments
  notes text,
  status text NOT NULL DEFAULT 'PRESCRIT', -- PRESCRIT -> EN_ATTENTE_PAIEMENT -> PAYE -> EN_ATTENTE_EXECUTION -> EN_COURS -> TERMINE -> VALIDE
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Historique des statuts
CREATE TABLE IF NOT EXISTS prescribed_item_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescribed_item_id uuid REFERENCES prescribed_items(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Factures pour les prescriptions
CREATE TABLE IF NOT EXISTS prescription_bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_number text NOT NULL UNIQUE,
  consultation_id uuid REFERENCES consultations(id),
  patient_id uuid REFERENCES patients(id),
  billed_by uuid REFERENCES profiles(id),
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING', -- PENDING | PAID | CANCELLED
  payment_id uuid REFERENCES payments(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Lignes de facture
CREATE TABLE IF NOT EXISTS prescription_bill_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id uuid REFERENCES prescription_bills(id) ON DELETE CASCADE,
  prescribed_item_id uuid REFERENCES prescribed_items(id),
  item_name text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6. Demandes de service (créées après paiement)
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescribed_item_id uuid REFERENCES prescribed_items(id),
  patient_id uuid REFERENCES patients(id),
  consultation_id uuid REFERENCES consultations(id),
  bill_id uuid REFERENCES prescription_bills(id),
  service_type text NOT NULL, -- 'HOSPITALISATION', 'SOINS_INFIRMIERS', 'PANSEMENT', 'PLATRE', 'CHIRURGIE'
  status text NOT NULL DEFAULT 'EN_ATTENTE', -- EN_ATTENTE -> ACCEPTE -> EN_COURS -> TERMINE -> VALIDE
  assigned_to uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Demandes de pharmacie
CREATE TABLE IF NOT EXISTS pharmacy_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescribed_item_id uuid REFERENCES prescribed_items(id),
  patient_id uuid REFERENCES patients(id),
  consultation_id uuid REFERENCES consultations(id),
  bill_id uuid REFERENCES prescription_bills(id),
  status text NOT NULL DEFAULT 'EN_ATTENTE', -- EN_ATTENTE -> EN_PREPARATION -> DELIVRE -> ANNULE
  dispensed_by uuid REFERENCES profiles(id),
  notes text,
  dispensed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Détails de délivrance pharmacie
CREATE TABLE IF NOT EXISTS pharmacy_dispensations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_request_id uuid REFERENCES pharmacy_requests(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES medications(id),
  quantity_dispensed numeric NOT NULL,
  batch_number text,
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  dispensed_by uuid REFERENCES profiles(id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_prescribed_items_consultation ON prescribed_items(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescribed_items_patient ON prescribed_items(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescribed_items_status ON prescribed_items(status);
CREATE INDEX IF NOT EXISTS idx_prescribed_items_type ON prescribed_items(item_type);
CREATE INDEX IF NOT EXISTS idx_prescription_bills_consultation ON prescription_bills(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescription_bills_patient ON prescription_bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_bills_status ON prescription_bills(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests(service_type);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_requests_status ON pharmacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_prescribed_item_history_item ON prescribed_item_history(prescribed_item_id);

-- RLS
ALTER TABLE medical_act_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescribed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescribed_item_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_dispensations ENABLE ROW LEVEL SECURITY;

-- Politiques permissives pour utilisateurs authentifiés
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'medical_act_types', 'prescribed_items', 'prescribed_item_history',
    'prescription_bills', 'prescription_bill_items', 'service_requests',
    'pharmacy_requests', 'pharmacy_dispensations'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_' || t AND tablename = t) THEN
      EXECUTE format('CREATE POLICY "auth_%s" ON %I FOR ALL USING (auth.role()=''authenticated'') WITH CHECK (auth.role()=''authenticated'')', t, t);
    END IF;
  END LOOP;
END $$;

-- Ajout aux publications realtime
ALTER PUBLICATION supabase_realtime ADD TABLE prescribed_items;
ALTER PUBLICATION supabase_realtime ADD TABLE prescribed_item_history;
ALTER PUBLICATION supabase_realtime ADD TABLE prescription_bills;
ALTER PUBLICATION supabase_realtime ADD TABLE prescription_bill_items;
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE pharmacy_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE pharmacy_dispensations;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON medical_act_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prescribed_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prescribed_item_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prescription_bills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prescription_bill_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON service_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_dispensations TO authenticated;

-- Données initiales : types d'actes médicaux
INSERT INTO medical_act_types (name, description, category, price) VALUES
  ('Hospitalisation', 'Hospitalisation journalière', 'HOSPITALISATION', 50000),
  ('Soins infirmiers', 'Soins infirmiers quotidiens', 'SOINS_INFIRMIERS', 15000),
  ('Pansement', 'Pansement standard', 'PANSEMENT', 10000),
  ('Plâtre', 'Appareil plâtré', 'PLATRE', 25000),
  ('Chirurgie mineure', 'Chirurgie mineure', 'CHIRURGIE', 150000),
  ('Chirurgie majeure', 'Chirurgie majeure', 'CHIRURGIE', 300000),
  ('Césarienne', 'Césarienne', 'CHIRURGIE', 200000),
  ('Anesthésie générale', 'Anesthésie générale', 'CHIRURGIE', 50000),
  ('Transfusion', 'Transfusion sanguine', 'SOINS_INFIRMIERS', 30000),
  ('Dialyse', 'Séance de dialyse', 'HOSPITALISATION', 80000)
ON CONFLICT DO NOTHING;