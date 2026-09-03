-- Accorder les privilèges de base au rôle authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_transfers TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
