-- Extension fiche clinique consultation (sections II à VII)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS clinical_data jsonb;
