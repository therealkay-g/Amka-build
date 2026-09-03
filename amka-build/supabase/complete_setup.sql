-- ============================================
-- SUPABASE COMPLETE SETUP - AMKA
-- ============================================
-- Exécute ce fichier dans l'éditeur SQL de Supabase

-- 1. Créer les extensions nécessaires
create extension if not exists "uuid-ossp";

-- 2. Créer les types ENUM
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        create type user_role as enum (
            'ADMIN','RECEPTIONIST','MEDECIN_DIRECTEUR','MEDECIN_1','MEDECIN_2','MEDECIN_3','PERCEPTEUR','PHARMACIEN','COMPTABLE',
            'ORTHOPEDISTE','PSYCHIATRE','LABORANTIN','TECHNICIEN_EG','TECHNICIEN_ECG',
            'RADIOLOGUE','KINESITHERAPEUTE','CHIRURGIEN','INFIRMIER','CAISSIER'
        );
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2b. Ajouter les nouveaux rôles si l'ENUM existait déjà
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'MEDECIN_1') THEN
        ALTER TYPE user_role ADD VALUE 'MEDECIN_1';
    END IF;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'MEDECIN_2') THEN
        ALTER TYPE user_role ADD VALUE 'MEDECIN_2';
    END IF;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'MEDECIN_3') THEN
        ALTER TYPE user_role ADD VALUE 'MEDECIN_3';
    END IF;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sexe_type') THEN
        create type sexe_type as enum ('MASCULIN','FEMININ');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consultation_status') THEN
        create type consultation_status as enum ('EN_ATTENTE','EN_COURS','TERMINEE','ANNULEE');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        create type payment_status as enum ('PENDING','COMPLETED','CANCELLED');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        create type payment_method as enum ('CASH','MOBILE_MONEY','BANK_TRANSFER','INSURANCE');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Créer les tables de base
CREATE TABLE IF NOT EXISTS profiles (
  id uuid references auth.users primary key,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  role user_role not null default 'RECEPTIONIST',
  is_active boolean default true,
  created_at timestamptz default now(),
  avatar_url text,
  phone text,
  theme_preference text check (theme_preference in ('light', 'dark')),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid references auth.users primary key,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  role user_role not null default 'RECEPTIONIST',
  is_active boolean default true,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS patients (
  id uuid primary key default uuid_generate_v4(),
  numero_dossier text unique not null,
  nom text not null,
  prenom text not null,
  postnom text,
  sexe sexe_type not null,
  date_naissance date not null,
  telephone text,
  adresse text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  type_handicap text,
  niveau_autonomie text,
  contact_urgence text,
  telephone_urgence text,
  medecin_referent text,
  date_admission date,
  appareillage text
);

CREATE TABLE IF NOT EXISTS consultations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) not null,
  medecin_id uuid references profiles(id) not null,
  motif text not null,
  diagnostic text,
  tension text,
  temperature float,
  poids float,
  traitement text,
  notes text,
  status consultation_status default 'EN_ATTENTE',
  date_consultation timestamptz default now(),
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) not null,
  collected_by uuid references profiles(id),
  montant float not null,
  type text not null,
  mode_paiement payment_method not null,
  status payment_status default 'PENDING',
  notes text,
  created_at timestamptz default now(),
  service_id uuid,
  service_type text
);

CREATE TABLE IF NOT EXISTS medications (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  unit text not null,
  price float not null,
  stock int default 0,
  threshold int default 10,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expiry_date date,
  supplier_id uuid,
  batch_number text
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid references medications(id) not null,
  patient_id uuid references patients(id),
  sold_by uuid references profiles(id),
  quantity int not null,
  unit_price float not null,
  total_price float not null,
  sold_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  amount float not null,
  category text not null,
  date date not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 4. Créer les tables manquantes
CREATE TABLE IF NOT EXISTS center_settings (
    id uuid primary key default uuid_generate_v4(),
    key text unique not null,
    value text,
    category text not null,
    updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS reception (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    received_by uuid references profiles(id),
    motif text not null,
    service_destine text not null,
    priorite text not null default 'NORMAL',
    status text not null default 'EN_ATTENTE',
    notes text,
    date_reception timestamptz default now(),
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS laboratory_exams (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    status text not null default 'EN_ATTENTE',
    montant float not null default 0,
    notes text,
    type_examen text not null,
    resultats text,
    prescripteur_id uuid references profiles(id),
    technicien_id uuid references profiles(id),
    priorite text not null default 'NORMAL',
    date_prescription date,
    date_resultat date,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS eg_exams (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    status text not null default 'EN_ATTENTE',
    montant float not null default 0,
    notes text,
    type_examen text not null,
    resultats text,
    prescripteur_id uuid references profiles(id),
    technicien_id uuid references profiles(id),
    date_examen date,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS ecg_exams (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    status text not null default 'EN_ATTENTE',
    montant float not null default 0,
    notes text,
    type_examen text not null,
    resultats text,
    frequence_cardiaque int,
    prescripteur_id uuid references profiles(id),
    technicien_id uuid references profiles(id),
    date_examen date,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS radiology_exams (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    status text not null default 'EN_ATTENTE',
    montant float not null default 0,
    notes text,
    type_examen text not null,
    zone_anatomique text,
    resultats text,
    prescripteur_id uuid references profiles(id),
    radiologue_id uuid references profiles(id),
    date_examen date,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS kinesitherapie_sessions (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    status text not null default 'EN_ATTENTE',
    montant float not null default 0,
    notes text,
    type_seance text not null,
    objectifs text,
    exercices text,
    evaluation_douleur int,
    kinesitherapeute_id uuid references profiles(id),
    date_seance date,
    duree_minutes int not null default 30,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS surgeries (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    status text not null default 'EN_ATTENTE',
    montant float not null default 0,
    notes text,
    type_intervention text not null,
    diagnostic_preop text,
    procedure text,
    salle text,
    chirurgien_id uuid references profiles(id),
    date_intervention date,
    duree_minutes int,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS hospitalizations (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    medecin_id uuid references profiles(id),
    chambre text,
    lit text,
    motif_admission text not null,
    diagnostic text,
    status text not null default 'EN_ATTENTE',
    montant_journalier float not null default 0,
    date_admission date,
    date_sortie date,
    notes text,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS nursing_cares (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    status text not null default 'EN_ATTENTE',
    montant float not null default 0,
    notes text,
    type_soin text not null,
    description text,
    infirmier_id uuid references profiles(id),
    date_soin date,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS plasters (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    status text not null default 'EN_ATTENTE',
    montant float not null default 0,
    notes text,
    zone_corps text not null,
    type_platre text not null,
    praticien_id uuid references profiles(id),
    date_pose date,
    date_retrait date,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS dressings (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references patients(id) not null,
    status text not null default 'EN_ATTENTE',
    montant float not null default 0,
    notes text,
    zone_corps text not null,
    type_pansement text not null,
    praticien_id uuid references profiles(id),
    date_pansement date,
    prochain_pansement date,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS pharmacy_suppliers (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    contact text,
    phone text,
    email text,
    address text,
    is_active boolean default true,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS pharmacy_purchases (
    id uuid primary key default uuid_generate_v4(),
    supplier_id uuid references pharmacy_suppliers(id),
    medication_id uuid references medications(id),
    quantity int not null,
    unit_price float not null,
    total_price float not null,
    purchase_date date not null,
    invoice_number text,
    created_by uuid references profiles(id),
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references profiles(id),
    action text not null,
    module text not null,
    entity_type text,
    entity_id text,
    details jsonb,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references profiles(id),
    type text not null,
    title text not null,
    message text not null,
    module text,
    entity_id text,
    is_read boolean default false,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS user_activities (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references profiles(id) not null,
    action text not null,
    module text not null,
    details text,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS backups (
    id uuid primary key default uuid_generate_v4(),
    filename text not null,
    size_bytes bigint,
    status text not null,
    created_by uuid references profiles(id),
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id uuid primary key default uuid_generate_v4(),
    role user_role not null,
    module text not null,
    can_view boolean default true,
    can_create boolean default false,
    can_edit boolean default false,
    can_delete boolean default false,
    unique(role, module)
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
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'RECEPTIONIST'::user_role),
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, email, first_name, last_name, role, is_active)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'Utilisateur'),
    coalesce(new.raw_user_meta_data->>'last_name', 'AMKA'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'RECEPTIONIST'::user_role),
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- 6. Créer le trigger si il n'existe pas
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. Activer RLS sur TOUTES les tables
ALTER TABLE profiles enable row level security;
ALTER TABLE users enable row level security;
ALTER TABLE patients enable row level security;
ALTER TABLE consultations enable row level security;
ALTER TABLE payments enable row level security;
ALTER TABLE medications enable row level security;
ALTER TABLE sales enable row level security;
ALTER TABLE expenses enable row level security;
ALTER TABLE center_settings enable row level security;
ALTER TABLE reception enable row level security;
ALTER TABLE laboratory_exams enable row level security;
ALTER TABLE eg_exams enable row level security;
ALTER TABLE ecg_exams enable row level security;
ALTER TABLE radiology_exams enable row level security;
ALTER TABLE kinesitherapie_sessions enable row level security;
ALTER TABLE surgeries enable row level security;
ALTER TABLE hospitalizations enable row level security;
ALTER TABLE nursing_cares enable row level security;
ALTER TABLE plasters enable row level security;
ALTER TABLE dressings enable row level security;
ALTER TABLE pharmacy_suppliers enable row level security;
ALTER TABLE pharmacy_purchases enable row level security;
ALTER TABLE audit_logs enable row level security;
ALTER TABLE notifications enable row level security;
ALTER TABLE user_activities enable row level security;
ALTER TABLE backups enable row level security;
ALTER TABLE role_permissions enable row level security;

-- 8. Créer les politiques RLS (permettre à tous les utilisateurs authentifiés d'accéder)
DO $$
BEGIN
    -- Vérifier si la politique existe avant de la créer
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'auth_profiles'
    ) THEN
        CREATE POLICY "auth_profiles" ON profiles FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'auth_users'
    ) THEN
        CREATE POLICY "auth_users" ON users FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'patients' AND policyname = 'auth_patients'
    ) THEN
        CREATE POLICY "auth_patients" ON patients FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'consultations' AND policyname = 'auth_consultations'
    ) THEN
        CREATE POLICY "auth_consultations" ON consultations FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payments' AND policyname = 'auth_payments'
    ) THEN
        CREATE POLICY "auth_payments" ON payments FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'medications' AND policyname = 'auth_medications'
    ) THEN
        CREATE POLICY "auth_medications" ON medications FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales' AND policyname = 'auth_sales'
    ) THEN
        CREATE POLICY "auth_sales" ON sales FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'expenses' AND policyname = 'auth_expenses'
    ) THEN
        CREATE POLICY "auth_expenses" ON expenses FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'center_settings' AND policyname = 'auth_center_settings'
    ) THEN
        CREATE POLICY "auth_center_settings" ON center_settings FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reception' AND policyname = 'auth_reception'
    ) THEN
        CREATE POLICY "auth_reception" ON reception FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'laboratory_exams' AND policyname = 'auth_laboratory_exams'
    ) THEN
        CREATE POLICY "auth_laboratory_exams" ON laboratory_exams FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'eg_exams' AND policyname = 'auth_eg_exams'
    ) THEN
        CREATE POLICY "auth_eg_exams" ON eg_exams FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ecg_exams' AND policyname = 'auth_ecg_exams'
    ) THEN
        CREATE POLICY "auth_ecg_exams" ON ecg_exams FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'radiology_exams' AND policyname = 'auth_radiology_exams'
    ) THEN
        CREATE POLICY "auth_radiology_exams" ON radiology_exams FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kinesitherapie_sessions' AND policyname = 'auth_kinesitherapie_sessions'
    ) THEN
        CREATE POLICY "auth_kinesitherapie_sessions" ON kinesitherapie_sessions FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'surgeries' AND policyname = 'auth_surgeries'
    ) THEN
        CREATE POLICY "auth_surgeries" ON surgeries FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'hospitalizations' AND policyname = 'auth_hospitalizations'
    ) THEN
        CREATE POLICY "auth_hospitalizations" ON hospitalizations FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'nursing_cares' AND policyname = 'auth_nursing_cares'
    ) THEN
        CREATE POLICY "auth_nursing_cares" ON nursing_cares FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'plasters' AND policyname = 'auth_plasters'
    ) THEN
        CREATE POLICY "auth_plasters" ON plasters FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'dressings' AND policyname = 'auth_dressings'
    ) THEN
        CREATE POLICY "auth_dressings" ON dressings FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pharmacy_suppliers' AND policyname = 'auth_pharmacy_suppliers'
    ) THEN
        CREATE POLICY "auth_pharmacy_suppliers" ON pharmacy_suppliers FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pharmacy_purchases' AND policyname = 'auth_pharmacy_purchases'
    ) THEN
        CREATE POLICY "auth_pharmacy_purchases" ON pharmacy_purchases FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_logs' AND policyname = 'auth_audit_logs'
    ) THEN
        CREATE POLICY "auth_audit_logs" ON audit_logs FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'auth_notifications'
    ) THEN
        CREATE POLICY "auth_notifications" ON notifications FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_activities' AND policyname = 'auth_user_activities'
    ) THEN
        CREATE POLICY "auth_user_activities" ON user_activities FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'backups' AND policyname = 'auth_backups'
    ) THEN
        CREATE POLICY "auth_backups" ON backups FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'role_permissions' AND policyname = 'auth_role_permissions'
    ) THEN
        CREATE POLICY "auth_role_permissions" ON role_permissions FOR ALL USING (auth.role()='authenticated');
    END IF;
END $$;

-- 9. Insérer les paramètres du centre
INSERT INTO center_settings (key, value, category) 
VALUES 
    ('center_name', 'Centre pour handicapés AMKA de Kindu A.S.B.L', 'general'),
    ('center_short_name', 'AMKA Kindu', 'general'),
    ('center_phone', '+243815615323', 'general'),
    ('center_address', 'Kindu, République Démocratique du Congo', 'general'),
    ('center_email', 'contact@amka-kindu.cd', 'general'),
    ('center_currency', 'CDF', 'general')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 10. Insérer les permissions par défaut
DO $$
DECLARE
    v_module text;
    v_role user_role;
    v_modules text[] := ARRAY['dashboard','reception','patients','consultations','perception','laboratoire','eg','ecg','radiologie','kinesitherapie','chirurgie','hospitalisation','soins_infirmiers','plâtres','pansements','pharmacie','comptabilite','rapports','impression','administration','parametres','profil','sauvegardes','audit','sante_systeme','historique','activites'];
    v_admin_roles user_role[] := ARRAY['ADMIN','MEDECIN_DIRECTEUR'];
BEGIN
    -- Recréer la table permissions proprement
    DROP TABLE IF EXISTS role_permissions;
    CREATE TABLE role_permissions (
        id uuid primary key default uuid_generate_v4(),
        role user_role not null,
        module text not null,
        can_view boolean default true,
        can_create boolean default false,
        can_edit boolean default false,
        can_delete boolean default false,
        unique(role, module)
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
        -- RÉCEPTIONNISTE
        ('RECEPTIONIST', 'dashboard', true, false, false, false),
        ('RECEPTIONIST', 'reception', true, true, true, false),
        ('RECEPTIONIST', 'patients', true, true, true, false),
        ('RECEPTIONIST', 'consultations', true, false, false, false),
        ('RECEPTIONIST', 'profil', true, false, true, false),
        
        -- PERCEPTEUR/CAISSIER
        ('PERCEPTEUR', 'dashboard', true, false, false, false),
        ('PERCEPTEUR', 'perception', true, true, true, false),
        ('PERCEPTEUR', 'patients', true, false, false, false),
        ('PERCEPTEUR', 'profil', true, false, true, false),
        
        ('CAISSIER', 'dashboard', true, false, false, false),
        ('CAISSIER', 'perception', true, true, true, false),
        ('CAISSIER', 'patients', true, false, false, false),
        ('CAISSIER', 'profil', true, false, true, false),
        
        -- PHARMACIEN
        ('PHARMACIEN', 'dashboard', true, false, false, false),
        ('PHARMACIEN', 'pharmacy', true, true, true, true),
        ('PHARMACIEN', 'patients', true, false, false, false),
        ('PHARMACIEN', 'profil', true, false, true, false),
        
        -- COMPTABLE
        ('COMPTABLE', 'dashboard', true, false, false, false),
        ('COMPTABLE', 'comptabilite', true, true, true, false),
        ('COMPTABLE', 'rapports', true, false, false, false),
        ('COMPTABLE', 'patients', true, false, false, false),
        ('COMPTABLE', 'profil', true, false, true, false),
        
        -- MÉDECINS
        ('ORTHOPEDISTE', 'dashboard', true, false, false, false),
        ('ORTHOPEDISTE', 'consultations', true, true, true, false),
        ('ORTHOPEDISTE', 'chirurgie', true, true, true, false),
        ('ORTHOPEDISTE', 'patients', true, false, false, false),
        ('ORTHOPEDISTE', 'profil', true, false, true, false),
        
        ('PSYCHIATRE', 'dashboard', true, false, false, false),
        ('PSYCHIATRE', 'consultations', true, true, true, false),
        ('PSYCHIATRE', 'patients', true, false, false, false),
        ('PSYCHIATRE', 'profil', true, false, true, false),
        
        -- TECHNICIENS
        ('LABORANTIN', 'dashboard', true, false, false, false),
        ('LABORANTIN', 'laboratoire', true, true, true, false),
        ('LABORANTIN', 'patients', true, false, false, false),
        ('LABORANTIN', 'profil', true, false, true, false),
        
        ('TECHNICIEN_EG', 'dashboard', true, false, false, false),
        ('TECHNICIEN_EG', 'eg', true, true, true, false),
        ('TECHNICIEN_EG', 'patients', true, false, false, false),
        ('TECHNICIEN_EG', 'profil', true, false, true, false),
        
        ('TECHNICIEN_ECG', 'dashboard', true, false, false, false),
        ('TECHNICIEN_ECG', 'ecg', true, true, true, false),
        ('TECHNICIEN_ECG', 'patients', true, false, false, false),
        ('TECHNICIEN_ECG', 'profil', true, false, true, false),
        
        ('RADIOLOGUE', 'dashboard', true, false, false, false),
        ('RADIOLOGUE', 'radiologie', true, true, true, false),
        ('RADIOLOGUE', 'patients', true, false, false, false),
        ('RADIOLOGUE', 'profil', true, false, true, false),
        
        -- KINÉSITHÉRAPEUTE
        ('KINESITHERAPEUTE', 'dashboard', true, false, false, false),
        ('KINESITHERAPEUTE', 'kinesitherapie', true, true, true, false),
        ('KINESITHERAPEUTE', 'patients', true, false, false, false),
        ('KINESITHERAPEUTE', 'profil', true, false, true, false),
        
        -- CHIRURGIEN
        ('CHIRURGIEN', 'dashboard', true, false, false, false),
        ('CHIRURGIEN', 'chirurgie', true, true, true, false),
        ('CHIRURGIEN', 'hospitalisation', true, true, true, false),
        ('CHIRURGIEN', 'patients', true, false, false, false),
        ('CHIRURGIEN', 'profil', true, false, true, false),
        
        -- INFIRMIER
        ('INFIRMIER', 'dashboard', true, false, false, false),
        ('INFIRMIER', 'soins_infirmiers', true, true, true, false),
        ('INFIRMIER', 'plâtres', true, true, true, false),
        ('INFIRMIER', 'pansements', true, true, true, false),
        ('INFIRMIER', 'hospitalisation', true, false, false, false),
        ('INFIRMIER', 'patients', true, false, false, false),
        ('INFIRMIER', 'profil', true, false, true, false),

        -- MÉDECINS (sans dashboard)
        ('MEDECIN_1', 'consultations', true, true, true, false),
        ('MEDECIN_1', 'rapports', true, false, false, false),
        ('MEDECIN_1', 'profil', true, false, true, false),
        ('MEDECIN_1', 'parametres', true, false, true, false),
        ('MEDECIN_1', 'file_transfers', true, true, true, false),

        ('MEDECIN_2', 'consultations', true, true, true, false),
        ('MEDECIN_2', 'rapports', true, false, false, false),
        ('MEDECIN_2', 'profil', true, false, true, false),
        ('MEDECIN_2', 'parametres', true, false, true, false),
        ('MEDECIN_2', 'file_transfers', true, true, true, false),

        ('MEDECIN_3', 'consultations', true, true, true, false),
        ('MEDECIN_3', 'rapports', true, false, false, false),
        ('MEDECIN_3', 'profil', true, false, true, false),
        ('MEDECIN_3', 'parametres', true, false, true, false),
        ('MEDECIN_3', 'file_transfers', true, true, true, false);
END
$$;
