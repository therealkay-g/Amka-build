-- Table des rendez-vous (safe migration)

-- Fonction updated_at si elle n'existe pas
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Enum (ignore si existe déjà)
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('PLANIFIE', 'CONFIRME', 'REALISE', 'ANNULE', 'ABSENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Table (ignore si existe déjà)
CREATE TABLE IF NOT EXISTS appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) not null,
  medecin_id uuid references profiles(id) not null,
  date_rdv timestamptz not null,
  duree_minutes int not null default 30,
  type_rdv text not null default 'Consultation',
  motif text not null,
  statut appointment_status not null default 'PLANIFIE',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ajouter colonnes manquantes si la table existait déjà sans elles
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES patients(id) NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS medecin_id uuid REFERENCES profiles(id) NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS date_rdv timestamptz NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duree_minutes int NOT NULL DEFAULT 30; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS type_rdv text NOT NULL DEFAULT 'Consultation'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS motif text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS statut appointment_status NOT NULL DEFAULT 'PLANIFIE'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index (ignore si existe déjà)
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date_rdv);
CREATE INDEX IF NOT EXISTS idx_appointments_medecin ON appointments(medecin_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_statut ON appointments(statut);

-- RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all for authenticated" ON appointments
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_appointments_updated_at ON appointments;
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
