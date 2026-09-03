-- ============================================
-- MIGRATION : MISE À JOUR DES RÔLES ET SCHÉMA
-- ============================================

-- 1. Mettre à jour le type user_role avec TOUS les rôles
-- Note: On doit d'abord supprimer les dépendances, puis recréer le type

-- Désactiver temporairement les contraintes pour éviter les erreurs
alter table profiles drop constraint if exists profiles_role_check;
alter table users drop constraint if exists users_role_check;

-- Supprimer l'ancien type (attention: il faut d'abord supprimer les colonnes qui l'utilisent !)
-- On va plutôt ajouter les nouveaux rôles à l'enum existant
-- Pour PostgreSQL >= 12, on peut utiliser ALTER TYPE ADD VALUE
DO $$
BEGIN
    -- Vérifier si les valeurs existent déjà avant de les ajouter
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'ORTHOPEDISTE') THEN
        ALTER TYPE user_role ADD VALUE 'ORTHOPEDISTE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'PSYCHIATRE') THEN
        ALTER TYPE user_role ADD VALUE 'PSYCHIATRE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'LABORANTIN') THEN
        ALTER TYPE user_role ADD VALUE 'LABORANTIN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'TECHNICIEN_EG') THEN
        ALTER TYPE user_role ADD VALUE 'TECHNICIEN_EG';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'TECHNICIEN_ECG') THEN
        ALTER TYPE user_role ADD VALUE 'TECHNICIEN_ECG';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'RADIOLOGUE') THEN
        ALTER TYPE user_role ADD VALUE 'RADIOLOGUE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'KINESITHERAPEUTE') THEN
        ALTER TYPE user_role ADD VALUE 'KINESITHERAPEUTE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'CHIRURGIEN') THEN
        ALTER TYPE user_role ADD VALUE 'CHIRURGIEN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'INFIRMIER') THEN
        ALTER TYPE user_role ADD VALUE 'INFIRMIER';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'CAISSIER') THEN
        ALTER TYPE user_role ADD VALUE 'CAISSIER';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'MEDECIN_1') THEN
        ALTER TYPE user_role ADD VALUE 'MEDECIN_1';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'MEDECIN_2') THEN
        ALTER TYPE user_role ADD VALUE 'MEDECIN_2';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'MEDECIN_3') THEN
        ALTER TYPE user_role ADD VALUE 'MEDECIN_3';
    END IF;
END
$$;

-- 2. Ajouter les champs manquants à la table patients
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'type_handicap') THEN
        ALTER TABLE patients ADD COLUMN type_handicap text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'niveau_autonomie') THEN
        ALTER TABLE patients ADD COLUMN niveau_autonomie text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'contact_urgence') THEN
        ALTER TABLE patients ADD COLUMN contact_urgence text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'telephone_urgence') THEN
        ALTER TABLE patients ADD COLUMN telephone_urgence text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'medecin_referent') THEN
        ALTER TABLE patients ADD COLUMN medecin_referent text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'date_admission') THEN
        ALTER TABLE patients ADD COLUMN date_admission date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'appareillage') THEN
        ALTER TABLE patients ADD COLUMN appareillage text;
    END IF;
END
$$;

-- 3. Ajouter les champs manquants à la table profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'theme_preference') THEN
        ALTER TABLE profiles ADD COLUMN theme_preference text check (theme_preference in ('light', 'dark'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at timestamptz default now();
    END IF;
END
$$;

-- 4. Ajouter les champs manquants à la table medications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'expiry_date') THEN
        ALTER TABLE medications ADD COLUMN expiry_date date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'supplier_id') THEN
        ALTER TABLE medications ADD COLUMN supplier_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'batch_number') THEN
        ALTER TABLE medications ADD COLUMN batch_number text;
    END IF;
END
$$;

-- 5. Créer les tables manquantes

-- Table center_settings
CREATE TABLE IF NOT EXISTS center_settings (
    id uuid primary key default uuid_generate_v4(),
    key text unique not null,
    value text,
    category text not null,
    updated_at timestamptz default now()
);

-- Table reception
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

-- Tables pour les services médicaux
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

-- Tables pour la pharmacie
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

-- Tables pour l'audit et l'activité
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

-- Table pour les sauvegardes
CREATE TABLE IF NOT EXISTS backups (
    id uuid primary key default uuid_generate_v4(),
    filename text not null,
    size_bytes bigint,
    status text not null,
    created_by uuid references profiles(id),
    created_at timestamptz default now()
);

-- Table pour les permissions par rôle
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

-- 6. Insérer les paramètres du centre
INSERT INTO center_settings (key, value, category) 
VALUES 
    ('center_name', 'Centre pour handicapés AMKA de Kindu A.S.B.L', 'general'),
    ('center_short_name', 'AMKA Kindu', 'general'),
    ('center_phone', '+243815615323', 'general'),
    ('center_address', 'Kindu, République Démocratique du Congo', 'general'),
    ('center_email', 'contact@amka-kindu.cd', 'general'),
    ('center_currency', 'CDF', 'general')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 7. Activer RLS sur les nouvelles tables
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

-- 8. Créer les politiques RLS (DROP puis CREATE pour idempotence)
DO $$
DECLARE
    t TEXT;
    tables_with_rls TEXT[] := ARRAY[
        'center_settings','reception','laboratory_exams','eg_exams','ecg_exams',
        'radiology_exams','kinesitherapie_sessions','surgeries','hospitalizations',
        'nursing_cares','plasters','dressings','pharmacy_suppliers','pharmacy_purchases',
        'audit_logs','notifications','user_activities','backups','role_permissions'
    ];
BEGIN
    FOREACH t IN ARRAY tables_with_rls LOOP
        EXECUTE format('DROP POLICY IF EXISTS "auth_%s" ON %I', t, t);
        EXECUTE format('CREATE POLICY "auth_%s" ON %I FOR ALL USING (auth.role()=''authenticated'')', t, t);
    END LOOP;
END
$$;

-- 9. Insérer les permissions par défaut
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
        can_view boolean default false,
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
