-- 1. Voir les politiques actuelles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('file_attachments', 'file_transfers');

-- 2. Supprimer et recréer proprement
DROP POLICY IF EXISTS "auth_file_attachments" ON file_attachments;
DROP POLICY IF EXISTS "auth_file_transfers" ON file_transfers;

CREATE POLICY "auth_file_attachments" ON file_attachments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_file_transfers" ON file_transfers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
