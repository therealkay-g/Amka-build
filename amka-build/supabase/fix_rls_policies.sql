-- Supprime les anciennes politiques et les recrée avec WITH CHECK pour les INSERT
DROP POLICY IF EXISTS "auth_file_attachments" ON file_attachments;
DROP POLICY IF EXISTS "auth_file_transfers" ON file_transfers;

CREATE POLICY "auth_file_attachments" ON file_attachments
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_file_transfers" ON file_transfers
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
