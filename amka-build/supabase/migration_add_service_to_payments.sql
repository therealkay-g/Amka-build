-- Ajout des champs de liaison entre paiements et services
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS service_id TEXT,
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Ajout d'un index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_payments_service ON payments(service_id, service_type);
