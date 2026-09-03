-- Corrige le type de entity_id dans file_attachments (uuid -> text)
ALTER TABLE file_attachments ALTER COLUMN entity_id TYPE text;
