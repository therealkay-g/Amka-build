-- Migration: Transformation Centre Médical de Réadaptation
-- Exécuter sur une base Supabase existante

-- Extension des rôles utilisateurs
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ORTHOPEDISTE';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PSYCHIATRE';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'LABORANTIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TECHNICIEN_EG';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TECHNICIEN_ECG';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'RADIOLOGUE';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'KINESITHERAPEUTE';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CHIRURGIEN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'INFIRMIER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CAISSIER';

-- Types pour les modules
DO $$ BEGIN
  CREATE TYPE service_status AS ENUM ('EN_ATTENTE','EN_COURS','TERMINE','ANNULE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exam_priority AS ENUM ('NORMAL','URGENT','CRITIQUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extension profils
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'light';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;

-- Extension patients (handicap / réadaptation)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS type_handicap text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS niveau_autonomie text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_urgence text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_urgence text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medecin_referent text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS date_admission date;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS appareillage text;

-- Extension médicaments
ALTER TABLE medications ADD COLUMN IF NOT EXISTS expiry_date date;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS supplier_id uuid;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS batch_number text;

-- Paramètres du centre
CREATE TABLE IF NOT EXISTS center_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value text,
  category text DEFAULT 'general',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Journal d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  module text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Notifications persistantes
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  module text,
  entity_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Réception
CREATE TABLE IF NOT EXISTS receptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  received_by uuid REFERENCES profiles(id),
  motif text NOT NULL,
  service_destine text NOT NULL,
  priorite exam_priority DEFAULT 'NORMAL',
  status service_status DEFAULT 'EN_ATTENTE',
  notes text,
  date_reception timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Examens laboratoire
CREATE TABLE IF NOT EXISTS laboratory_exams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  prescripteur_id uuid REFERENCES profiles(id),
  technicien_id uuid REFERENCES profiles(id),
  type_examen text NOT NULL,
  resultats text,
  status service_status DEFAULT 'EN_ATTENTE',
  priorite exam_priority DEFAULT 'NORMAL',
  montant float DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  notes text,
  date_prescription timestamptz DEFAULT now(),
  date_resultat timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Examens EG
CREATE TABLE IF NOT EXISTS eg_exams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  prescripteur_id uuid REFERENCES profiles(id),
  technicien_id uuid REFERENCES profiles(id),
  type_examen text NOT NULL,
  resultats text,
  status service_status DEFAULT 'EN_ATTENTE',
  montant float DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  notes text,
  date_examen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Examens ECG
CREATE TABLE IF NOT EXISTS ecg_exams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  prescripteur_id uuid REFERENCES profiles(id),
  technicien_id uuid REFERENCES profiles(id),
  type_examen text NOT NULL,
  resultats text,
  frequence_cardiaque int,
  status service_status DEFAULT 'EN_ATTENTE',
  montant float DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  notes text,
  date_examen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Radiologie
CREATE TABLE IF NOT EXISTS radiology_exams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  prescripteur_id uuid REFERENCES profiles(id),
  radiologue_id uuid REFERENCES profiles(id),
  type_examen text NOT NULL,
  zone_anatomique text,
  resultats text,
  status service_status DEFAULT 'EN_ATTENTE',
  montant float DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  notes text,
  date_examen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Kinésithérapie
CREATE TABLE IF NOT EXISTS kinesitherapie_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  kinesitherapeute_id uuid REFERENCES profiles(id),
  type_seance text NOT NULL,
  objectifs text,
  exercices text,
  evaluation_douleur int,
  status service_status DEFAULT 'EN_ATTENTE',
  montant float DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  notes text,
  date_seance timestamptz DEFAULT now(),
  duree_minutes int DEFAULT 45,
  created_at timestamptz DEFAULT now()
);

-- Chirurgie
CREATE TABLE IF NOT EXISTS surgeries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  chirurgien_id uuid REFERENCES profiles(id),
  type_intervention text NOT NULL,
  diagnostic_preop text,
  procedure text,
  salle text,
  status service_status DEFAULT 'EN_ATTENTE',
  montant float DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  notes text,
  date_intervention timestamptz DEFAULT now(),
  duree_minutes int,
  created_at timestamptz DEFAULT now()
);

-- Hospitalisation
CREATE TABLE IF NOT EXISTS hospitalizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  medecin_id uuid REFERENCES profiles(id),
  chambre text,
  lit text,
  motif_admission text NOT NULL,
  diagnostic text,
  status service_status DEFAULT 'EN_COURS',
  montant_journalier float DEFAULT 0,
  date_admission timestamptz DEFAULT now(),
  date_sortie timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Soins infirmiers
CREATE TABLE IF NOT EXISTS nursing_care (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  infirmier_id uuid REFERENCES profiles(id),
  type_soin text NOT NULL,
  description text,
  status service_status DEFAULT 'EN_ATTENTE',
  montant float DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  notes text,
  date_soin timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Plâtres
CREATE TABLE IF NOT EXISTS plasters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  praticien_id uuid REFERENCES profiles(id),
  zone_corps text NOT NULL,
  type_platre text NOT NULL,
  status service_status DEFAULT 'EN_COURS',
  montant float DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  date_pose timestamptz DEFAULT now(),
  date_retrait timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Pansements
CREATE TABLE IF NOT EXISTS dressings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  praticien_id uuid REFERENCES profiles(id),
  zone_corps text NOT NULL,
  type_pansement text NOT NULL,
  status service_status DEFAULT 'TERMINE',
  montant float DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  date_pansement timestamptz DEFAULT now(),
  prochain_pansement timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Fournisseurs pharmacie
CREATE TABLE IF NOT EXISTS pharmacy_suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact text,
  phone text,
  email text,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Achats pharmacie
CREATE TABLE IF NOT EXISTS pharmacy_purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id uuid REFERENCES pharmacy_suppliers(id),
  medication_id uuid REFERENCES medications(id),
  quantity int NOT NULL,
  unit_price float NOT NULL,
  total_price float NOT NULL,
  purchase_date date NOT NULL,
  invoice_number text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Mouvements de stock
CREATE TABLE IF NOT EXISTS pharmacy_stock_movements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id uuid REFERENCES medications(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('ENTREE','SORTIE','AJUSTEMENT','VENTE')),
  quantity int NOT NULL,
  reason text,
  reference_id uuid,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Sauvegardes (métadonnées)
CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename text NOT NULL,
  size_bytes bigint,
  status text DEFAULT 'COMPLETED',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Activités utilisateur
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  action text NOT NULL,
  module text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Permissions personnalisables par rôle
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  module text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  UNIQUE(role, module)
);

-- Données initiales paramètres centre
INSERT INTO center_settings (key, value, category) VALUES
  ('center_name', 'Centre pour handicapés AMKA de Kindu A.S.B.L', 'general'),
  ('center_phone', '+243815615323', 'general'),
  ('center_address', 'Kindu, RDC', 'general'),
  ('center_email', 'contact@amka-kindu.cd', 'general'),
  ('currency', 'CDF', 'general'),
  ('backup_frequency', 'daily', 'backup'),
  ('session_timeout', '30', 'security')
ON CONFLICT (key) DO NOTHING;

-- RLS pour nouvelles tables
ALTER TABLE center_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE eg_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecg_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE radiology_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesitherapie_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nursing_care ENABLE ROW LEVEL SECURITY;
ALTER TABLE plasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE dressings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'center_settings','audit_logs','notifications','receptions',
    'laboratory_exams','eg_exams','ecg_exams','radiology_exams',
    'kinesitherapie_sessions','surgeries','hospitalizations','nursing_care',
    'plasters','dressings','pharmacy_suppliers','pharmacy_purchases',
    'pharmacy_stock_movements','backups','user_activities','role_permissions'
  ] LOOP
    EXECUTE format('CREATE POLICY IF NOT EXISTS "auth_%s" ON %I FOR ALL USING (auth.role()=''authenticated'')', t, t);
  END LOOP;
END $$;

-- Realtime pour synchronisation inter-modules
ALTER PUBLICATION supabase_realtime ADD TABLE receptions;
ALTER PUBLICATION supabase_realtime ADD TABLE laboratory_exams;
ALTER PUBLICATION supabase_realtime ADD TABLE eg_exams;
ALTER PUBLICATION supabase_realtime ADD TABLE ecg_exams;
ALTER PUBLICATION supabase_realtime ADD TABLE radiology_exams;
ALTER PUBLICATION supabase_realtime ADD TABLE kinesitherapie_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE surgeries;
ALTER PUBLICATION supabase_realtime ADD TABLE hospitalizations;
ALTER PUBLICATION supabase_realtime ADD TABLE nursing_care;
ALTER PUBLICATION supabase_realtime ADD TABLE plasters;
ALTER PUBLICATION supabase_realtime ADD TABLE dressings;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
