-- Migration: Upload de fichiers et transferts
CREATE TABLE IF NOT EXISTS file_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text,
  uploaded_by uuid REFERENCES profiles(id),
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_attachment_id uuid REFERENCES file_attachments(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) NOT NULL,
  recipient_id uuid REFERENCES profiles(id) NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_transfers_recipient ON file_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_file_transfers_sender ON file_transfers(sender_id);

ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_transfers ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['file_attachments', 'file_transfers'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_' || t AND tablename = t) THEN
      EXECUTE format('CREATE POLICY "auth_%s" ON %I FOR ALL USING (auth.role()=''authenticated'') WITH CHECK (auth.role()=''authenticated'')', t, t);
    END IF;
  END LOOP;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE file_transfers;

-- Accorder les privilèges de base au rôle authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_transfers TO authenticated;
