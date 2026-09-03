-- ============================================
-- SUPABASE COMPLETE SETUP - AMKA
-- ============================================
-- Exécute ce fichier dans l'éditeur SQL de Supabase

-- 1. Créer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Créer les types ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'ADMIN','RECEPTIONIST','MEDECIN_DIRECTEUR','MEDECIN_1','MEDECIN_2','MEDECIN_3','PERCEPTEUR','PHARMACIEN','COMPTABLE',
            'ORTHOPEDISTE','PSYCHIATRE','LABORANTIN','TECHNICIEN_EG','TECHNICIEN_ECG',
            'RADIOLOGUE','KINESITHERAPEUTE','CHIRURGIEN','INFIRMIER','CAISSIER'
        );
    END IF;
END
$$;

-- 2b. Ajouter les nouveaux rôles si l'ENUM existait déjà
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'MEDECIN_1') THEN
        ALTER TYPE user_role ADD VALUE 'MEDECIN_1';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'MEDECIN_2') THEN
        ALTER TYPE user_role ADD VALUE 'MEDECIN_2';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'MEDECIN_3') THEN
        ALTER TYPE user_role ADD VALUE 'MEDECIN_3';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sexe_type') THEN
        CREATE TYPE sexe_type AS ENUM ('MASCULIN','FEMININ');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consultation_status') THEN
        CREATE TYPE consultation_status AS ENUM ('EN_ATTENTE','EN_COURS','TERMINEE','ANNULEE');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('PENDING','COMPLETED','CANCELLED');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('CASH','MOBILE_MONEY','BANK_TRANSFER','INSURANCE');
    END IF;
END
$$;

-- 3. Créer les tables de base
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'ADMIN',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  avatar_url TEXT,
  phone TEXT,
  theme_preference TEXT CHECK (theme_preference IN ('light', 'dark')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'ADMIN',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_dossier TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  postnom TEXT,
  sexe sexe_type NOT NULL,
  date_naissance DATE NOT NULL,
  telephone TEXT,
  adresse TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  type_handicap TEXT,
  niveau_autonomie TEXT,
  contact_urgence TEXT,
  telephone_urgence TEXT,
  medecin_referent TEXT,
  date_admission DATE,
  appareillage TEXT
);

CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  medecin_id UUID REFERENCES profiles(id) NOT NULL,
  motif TEXT NOT NULL,
  diagnostic TEXT,
  tension TEXT,
  temperature FLOAT,
  poids FLOAT,
  traitement TEXT,
  notes TEXT,
  status consultation_status DEFAULT 'EN_ATTENTE',
  date_consultation TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  collected_by UUID REFERENCES profiles(id),
  montant FLOAT NOT NULL,
  type TEXT NOT NULL,
  mode_paiement payment_method NOT NULL,
  status payment_status DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  service_id UUID,
  service_type TEXT
);

CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  price FLOAT NOT NULL,
  stock INT DEFAULT 0,
  threshold INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expiry_date DATE,
  supplier_id UUID,
  batch_number TEXT
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID REFERENCES medications(id) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  sold_by UUID REFERENCES profiles(id),
  quantity INT NOT NULL,
  unit_price FLOAT NOT NULL,
  total_price FLOAT NOT NULL,
  sold_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount FLOAT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Créer les tables manquantes
CREATE TABLE IF NOT EXISTS center_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    category TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reception (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    received_by UUID REFERENCES profiles(id),
    motif TEXT NOT NULL,
    service_destine TEXT NOT NULL,
    priorite TEXT NOT NULL DEFAULT 'NORMAL',
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    notes TEXT,
    date_reception TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS laboratory_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant FLOAT NOT NULL DEFAULT 0,
    notes TEXT,
    type_examen TEXT NOT NULL,
    resultats TEXT,
    prescripteur_id UUID REFERENCES profiles(id),
    technicien_id UUID REFERENCES profiles(id),
    priorite TEXT NOT NULL DEFAULT 'NORMAL',
    date_prescription DATE,
    date_resultat DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eg_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant FLOAT NOT NULL DEFAULT 0,
    notes TEXT,
    type_examen TEXT NOT NULL,
    resultats TEXT,
    prescripteur_id UUID REFERENCES profiles(id),
    technicien_id UUID REFERENCES profiles(id),
    date_examen DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecg_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant FLOAT NOT NULL DEFAULT 0,
    notes TEXT,
    type_examen TEXT NOT NULL,
    resultats TEXT,
    frequence_cardiaque INT,
    prescripteur_id UUID REFERENCES profiles(id),
    technicien_id UUID REFERENCES profiles(id),
    date_examen DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radiology_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant FLOAT NOT NULL DEFAULT 0,
    notes TEXT,
    type_examen TEXT NOT NULL,
    zone_anatomique TEXT,
    resultats TEXT,
    prescripteur_id UUID REFERENCES profiles(id),
    radiologue_id UUID REFERENCES profiles(id),
    date_examen DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kinesitherapie_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant FLOAT NOT NULL DEFAULT 0,
    notes TEXT,
    type_seance TEXT NOT NULL,
    objectifs TEXT,
    exercices TEXT,
    evaluation_douleur INT,
    kinesitherapeute_id UUID REFERENCES profiles(id),
    date_seance DATE,
    duree_minutes INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surgeries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant FLOAT NOT NULL DEFAULT 0,
    notes TEXT,
    type_intervention TEXT NOT NULL,
    diagnostic_preop TEXT,
    procedure TEXT,
    salle TEXT,
    chirurgien_id UUID REFERENCES profiles(id),
    date_intervention DATE,
    duree_minutes INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospitalizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    medecin_id UUID REFERENCES profiles(id),
    chambre TEXT,
    lit TEXT,
    motif_admission TEXT NOT NULL,
    diagnostic TEXT,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant_journalier FLOAT NOT NULL DEFAULT 0,
    date_admission DATE,
    date_sortie DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_cares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant FLOAT NOT NULL DEFAULT 0,
    notes TEXT,
    type_soin TEXT NOT NULL,
    description TEXT,
    infirmier_id UUID REFERENCES profiles(id),
    date_soin DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plasters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant FLOAT NOT NULL DEFAULT 0,
    notes TEXT,
    zone_corps TEXT NOT NULL,
    type_platre TEXT NOT NULL,
    praticien_id UUID REFERENCES profiles(id),
    date_pose DATE,
    date_retrait DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dressings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    montant FLOAT NOT NULL DEFAULT 0,
    notes TEXT,
    zone_corps TEXT NOT NULL,
    type_pansement TEXT NOT NULL,
    praticien_id UUID REFERENCES profiles(id),
    date_pansement DATE,
    prochain_pansement DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES pharmacy_suppliers(id),
    medication_id UUID REFERENCES medications(id),
    quantity INT NOT NULL,
    unit_price FLOAT NOT NULL,
    total_price FLOAT NOT NULL,
    purchase_date DATE NOT NULL,
    invoice_number TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID REFERENCES medications(id) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ENTREE', 'VENTE')),
    quantity INT NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    module TEXT,
    entity_id TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    size_bytes BIGINT,
    status TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS role_permissions;

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    module TEXT NOT NULL,
    can_view BOOLEAN DEFAULT TRUE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    UNIQUE(role, module)
);

-- 5. Créer la fonction trigger pour les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'first_name', 'Utilisateur'),
        coalesce(new.raw_user_meta_data->>'last_name', 'AMKA'),
        coalesce((new.raw_user_meta_data->>'role')::user_role, 'ADMIN'::user_role),
        true
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.users (id, email, first_name, last_name, role, is_active)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'first_name', 'Utilisateur'),
        coalesce(new.raw_user_meta_data->>'last_name', 'AMKA'),
        coalesce((new.raw_user_meta_data->>'role')::user_role, 'ADMIN'::user_role),
        true
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN new;
END;
$$;

-- 6. Créer le trigger si il n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END
$$;

-- 7. Activer RLS sur TOUTES les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE eg_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecg_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE radiology_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinesitherapie_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nursing_cares ENABLE ROW LEVEL SECURITY;
ALTER TABLE plasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE dressings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- 8. Donner TOUS les droits sur le schéma public
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 9. Créer des politiques permissives
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'auth_profiles') THEN
        CREATE POLICY "auth_profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'auth_users') THEN
        CREATE POLICY "auth_users" ON users FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'auth_patients') THEN
        CREATE POLICY "auth_patients" ON patients FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultations' AND policyname = 'auth_consultations') THEN
        CREATE POLICY "auth_consultations" ON consultations FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'auth_payments') THEN
        CREATE POLICY "auth_payments" ON payments FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medications' AND policyname = 'auth_medications') THEN
        CREATE POLICY "auth_medications" ON medications FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'auth_sales') THEN
        CREATE POLICY "auth_sales" ON sales FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'auth_expenses') THEN
        CREATE POLICY "auth_expenses" ON expenses FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'center_settings' AND policyname = 'auth_center_settings') THEN
        CREATE POLICY "auth_center_settings" ON center_settings FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reception' AND policyname = 'auth_reception') THEN
        CREATE POLICY "auth_reception" ON reception FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laboratory_exams' AND policyname = 'auth_laboratory_exams') THEN
        CREATE POLICY "auth_laboratory_exams" ON laboratory_exams FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'eg_exams' AND policyname = 'auth_eg_exams') THEN
        CREATE POLICY "auth_eg_exams" ON eg_exams FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ecg_exams' AND policyname = 'auth_ecg_exams') THEN
        CREATE POLICY "auth_ecg_exams" ON ecg_exams FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'radiology_exams' AND policyname = 'auth_radiology_exams') THEN
        CREATE POLICY "auth_radiology_exams" ON radiology_exams FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kinesitherapie_sessions' AND policyname = 'auth_kinesitherapie_sessions') THEN
        CREATE POLICY "auth_kinesitherapie_sessions" ON kinesitherapie_sessions FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'surgeries' AND policyname = 'auth_surgeries') THEN
        CREATE POLICY "auth_surgeries" ON surgeries FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hospitalizations' AND policyname = 'auth_hospitalizations') THEN
        CREATE POLICY "auth_hospitalizations" ON hospitalizations FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nursing_cares' AND policyname = 'auth_nursing_cares') THEN
        CREATE POLICY "auth_nursing_cares" ON nursing_cares FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plasters' AND policyname = 'auth_plasters') THEN
        CREATE POLICY "auth_plasters" ON plasters FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dressings' AND policyname = 'auth_dressings') THEN
        CREATE POLICY "auth_dressings" ON dressings FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_suppliers' AND policyname = 'auth_pharmacy_suppliers') THEN
        CREATE POLICY "auth_pharmacy_suppliers" ON pharmacy_suppliers FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_purchases' AND policyname = 'auth_pharmacy_purchases') THEN
        CREATE POLICY "auth_pharmacy_purchases" ON pharmacy_purchases FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_stock_movements' AND policyname = 'auth_pharmacy_stock_movements') THEN
        CREATE POLICY "auth_pharmacy_stock_movements" ON pharmacy_stock_movements FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'auth_audit_logs') THEN
        CREATE POLICY "auth_audit_logs" ON audit_logs FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'auth_notifications') THEN
        CREATE POLICY "auth_notifications" ON notifications FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_activities' AND policyname = 'auth_user_activities') THEN
        CREATE POLICY "auth_user_activities" ON user_activities FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'backups' AND policyname = 'auth_backups') THEN
        CREATE POLICY "auth_backups" ON backups FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'auth_role_permissions') THEN
        CREATE POLICY "auth_role_permissions" ON role_permissions FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

-- 10. Insérer les paramètres du centre
INSERT INTO center_settings (key, value, category) 
VALUES 
    ('center_name', 'Centre pour handicapés AMKA de Kindu A.S.B.L', 'general'),
    ('center_short_name', 'AMKA Kindu', 'general'),
    ('center_phone', '+243815615323', 'general'),
    ('center_address', 'Kindu, République Démocratique du Congo', 'general'),
    ('center_email', 'contact@amka-kindu.cd', 'general'),
    ('center_currency', 'CDF', 'general')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- 11. Insérer les permissions par défaut
DO $$
DECLARE
    v_module TEXT;
    v_role user_role;
    v_modules TEXT[] := ARRAY['dashboard','reception','patients','consultations','perception','laboratoire','eg','ecg','radiologie','kinesitherapie','chirurgie','hospitalisation','soins_infirmiers','plâtres','pansements','pharmacie','comptabilite','rapports','impression','administration','parametres','profil','sauvegardes','audit','sante_systeme','historique','activites'];
    v_admin_roles user_role[] := ARRAY['ADMIN','MEDECIN_DIRECTEUR'];
BEGIN
    -- Recréer la table permissions proprement
    DROP TABLE IF EXISTS role_permissions;
    CREATE TABLE role_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role user_role NOT NULL,
        module TEXT NOT NULL,
        can_view BOOLEAN DEFAULT TRUE,
        can_create BOOLEAN DEFAULT FALSE,
        can_edit BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        UNIQUE(role, module)
    );

    -- Pour ADMIN et MEDECIN_DIRECTEUR: tous les droits sur tous les modules
    FOREACH v_role IN ARRAY v_admin_roles LOOP
        FOREACH v_module IN ARRAY v_modules LOOP
            INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete)
            VALUES (v_role, v_module, true, true, true, true);
        END LOOP;
    END LOOP;

    -- Pour les autres rôles: droits de base
    INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete)
    VALUES 
        ('RECEPTIONIST', 'dashboard', true, true, true, true),
        ('RECEPTIONIST', 'reception', true, true, true, true),
        ('RECEPTIONIST', 'patients', true, true, true, true),
        ('RECEPTIONIST', 'consultations', true, true, true, true),
        ('RECEPTIONIST', 'profil', true, true, true, true),

        ('PERCEPTEUR', 'dashboard', true, true, true, true),
        ('PERCEPTEUR', 'perception', true, true, true, true),
        ('PERCEPTEUR', 'patients', true, true, true, true),
        ('PERCEPTEUR', 'profil', true, true, true, true),

        ('CAISSIER', 'dashboard', true, true, true, true),
        ('CAISSIER', 'perception', true, true, true, true),
        ('CAISSIER', 'patients', true, true, true, true),
        ('CAISSIER', 'profil', true, true, true, true),

        ('PHARMACIEN', 'dashboard', true, true, true, true),
        ('PHARMACIEN', 'pharmacie', true, true, true, true),
        ('PHARMACIEN', 'patients', true, true, true, true),
        ('PHARMACIEN', 'profil', true, true, true, true),

        ('COMPTABLE', 'dashboard', true, true, true, true),
        ('COMPTABLE', 'comptabilite', true, true, true, true),
        ('COMPTABLE', 'rapports', true, true, true, true),
        ('COMPTABLE', 'patients', true, true, true, true),
        ('COMPTABLE', 'profil', true, true, true, true),

        ('ORTHOPEDISTE', 'dashboard', true, true, true, true),
        ('ORTHOPEDISTE', 'consultations', true, true, true, true),
        ('ORTHOPEDISTE', 'chirurgie', true, true, true, true),
        ('ORTHOPEDISTE', 'patients', true, true, true, true),
        ('ORTHOPEDISTE', 'profil', true, true, true, true),

        ('PSYCHIATRE', 'dashboard', true, true, true, true),
        ('PSYCHIATRE', 'consultations', true, true, true, true),
        ('PSYCHIATRE', 'patients', true, true, true, true),
        ('PSYCHIATRE', 'profil', true, true, true, true),

        ('LABORANTIN', 'dashboard', true, true, true, true),
        ('LABORANTIN', 'laboratoire', true, true, true, true),
        ('LABORANTIN', 'patients', true, true, true, true),
        ('LABORANTIN', 'profil', true, true, true, true),

        ('TECHNICIEN_EG', 'dashboard', true, true, true, true),
        ('TECHNICIEN_EG', 'eg', true, true, true, true),
        ('TECHNICIEN_EG', 'patients', true, true, true, true),
        ('TECHNICIEN_EG', 'profil', true, true, true, true),

        ('TECHNICIEN_ECG', 'dashboard', true, true, true, true),
        ('TECHNICIEN_ECG', 'ecg', true, true, true, true),
        ('TECHNICIEN_ECG', 'patients', true, true, true, true),
        ('TECHNICIEN_ECG', 'profil', true, true, true, true),

        ('RADIOLOGUE', 'dashboard', true, true, true, true),
        ('RADIOLOGUE', 'radiologie', true, true, true, true),
        ('RADIOLOGUE', 'patients', true, true, true, true),
        ('RADIOLOGUE', 'profil', true, true, true, true),

        ('KINESITHERAPEUTE', 'dashboard', true, true, true, true),
        ('KINESITHERAPEUTE', 'kinesitherapie', true, true, true, true),
        ('KINESITHERAPEUTE', 'patients', true, true, true, true),
        ('KINESITHERAPEUTE', 'profil', true, true, true, true),

        ('CHIRURGIEN', 'dashboard', true, true, true, true),
        ('CHIRURGIEN', 'chirurgie', true, true, true, true),
        ('CHIRURGIEN', 'hospitalisation', true, true, true, true),
        ('CHIRURGIEN', 'patients', true, true, true, true),
        ('CHIRURGIEN', 'profil', true, true, true, true),

        ('INFIRMIER', 'dashboard', true, true, true, true),
        ('INFIRMIER', 'soins_infirmiers', true, true, true, true),
        ('INFIRMIER', 'plâtres', true, true, true, true),
        ('INFIRMIER', 'pansements', true, true, true, true),
        ('INFIRMIER', 'hospitalisation', true, true, true, true),
        ('INFIRMIER', 'patients', true, true, true, true),
        ('INFIRMIER', 'profil', true, true, true, true),

        ('MEDECIN_1', 'consultations', true, true, true, true),
        ('MEDECIN_1', 'rapports', true, true, true, true),
        ('MEDECIN_1', 'profil', true, true, true, true),
        ('MEDECIN_1', 'parametres', true, true, true, true),
        ('MEDECIN_1', 'file_transfers', true, true, true, true),

        ('MEDECIN_2', 'consultations', true, true, true, true),
        ('MEDECIN_2', 'rapports', true, true, true, true),
        ('MEDECIN_2', 'profil', true, true, true, true),
        ('MEDECIN_2', 'parametres', true, true, true, true),
        ('MEDECIN_2', 'file_transfers', true, true, true, true),

        ('MEDECIN_3', 'consultations', true, true, true, true),
        ('MEDECIN_3', 'rapports', true, true, true, true),
        ('MEDECIN_3', 'profil', true, true, true, true),
        ('MEDECIN_3', 'parametres', true, true, true, true),
        ('MEDECIN_3', 'file_transfers', true, true, true, true);
END
$$;
