-- ============================================================================
-- SUPPRESSION COMPLÈTE D'UN UTILISATEUR (nettoyage automatique des références)
-- ----------------------------------------------------------------------------
-- À exécuter UNE FOIS dans le SQL Editor de Supabase (Database > SQL Editor).
--
-- Crée un trigger "on_auth_user_deleted" sur auth.users : avant chaque
-- suppression d'un compte (via l'app ou l'API admin), il nettoie automatiquement
-- toutes les lignes liées :
--   - public.users et public.profiles (contraintes users_id_fkey / profiles_id_fkey)
--   - les tables de journalisation (user_activities, audit_logs, notifications)
--   - les transferts de fichiers (file_transfers)
--   - met à NULL les colonnes FK nullable qui pointent vers profiles(id)
--   - pour consultations.medecin_id et appointments.medecin_id (NOT NULL),
--     retire NOT NULL puis met NULL pour préserver l'historique médical.
--
-- Idempotent : peut être ré-exécuté sans risque.
-- ============================================================================

create or replace function public.handle_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  c text;
begin
  -- 1) Table legacy "users" (cause de l'erreur users_id_fkey)
  if to_regclass('public.users') is not null then
    delete from public.users where id = old.id;
  end if;

  -- 2) Tables de journalisation : suppression des lignes liées à l'utilisateur
  for r in values
    ('user_activities', 'user_id'),
    ('audit_logs', 'user_id'),
    ('notifications', 'user_id')
  loop
    if to_regclass('public.' || r.column1) is not null
       and exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = r.column1 and column_name = r.column2)
    then
      execute format('delete from public.%I where %I = $1', r.column1, r.column2) using old.id;
    end if;
  end loop;

  -- 3) Transferts de fichiers (sender_id / recipient_id NOT NULL) -> suppression
  if to_regclass('public.file_transfers') is not null then
    delete from public.file_transfers where sender_id = old.id or recipient_id = old.id;
  end if;

  -- 4) Colonnes FK nullable -> NULL (on conserve l'historique médical des patients)
  for r in values
    ('payments', array['collected_by']),
    ('sales', array['sold_by']),
    ('expenses', array['created_by']),
    ('reception', array['received_by']),
    ('receptions', array['received_by']),
    ('center_settings', array['updated_by']),
    ('laboratory_exams', array['prescripteur_id','technicien_id']),
    ('eg_exams', array['prescripteur_id','technicien_id']),
    ('ecg_exams', array['prescripteur_id','technicien_id']),
    ('radiology_exams', array['prescripteur_id','radiologue_id']),
    ('kinesitherapie_sessions', array['kinesitherapeute_id']),
    ('surgeries', array['chirurgien_id']),
    ('hospitalizations', array['medecin_id']),
    ('nursing_cares', array['infirmier_id']),
    ('plasters', array['praticien_id']),
    ('dressings', array['praticien_id']),
    ('pharmacy_purchases', array['created_by']),
    ('pharmacy_stock_movements', array['created_by']),
    ('backups', array['created_by']),
    ('appointments', array['created_by']),
    ('prescribed_items', array['prescribed_by']),
    ('prescribed_item_history', array['changed_by']),
    ('prescription_bills', array['billed_by']),
    ('service_requests', array['assigned_to']),
    ('pharmacy_requests', array['dispensed_by']),
    ('pharmacy_dispensations', array['dispensed_by']),
    ('invoices', array['medecin_id','created_by']),
    ('exam_status_history', array['changed_by']),
    ('file_attachments', array['uploaded_by'])
  loop
    if to_regclass('public.' || r.column1) is not null then
      foreach c in array r.column2::text[] loop
        if exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = r.column1 and column_name = c) then
          execute format('update public.%I set %I = null where %I = $1', r.column1, c, c) using old.id;
        end if;
      end loop;
    end if;
  end loop;

  -- 5) consultations.medecin_id et appointments.medecin_id sont NOT NULL :
  --    on retire NOT NULL puis on met NULL pour ne pas perdre les dossiers patients.
  if to_regclass('public.consultations') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'consultations' and column_name = 'medecin_id') then
    begin
      alter table public.consultations alter column medecin_id drop not null;
    exception when others then null; end;
    update public.consultations set medecin_id = null where medecin_id = old.id;
  end if;

  if to_regclass('public.appointments') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'appointments' and column_name = 'medecin_id') then
    begin
      alter table public.appointments alter column medecin_id drop not null;
    exception when others then null; end;
    update public.appointments set medecin_id = null where medecin_id = old.id;
  end if;

  -- 6) Profil (cause de l'erreur profiles_id_fkey si elle survient)
  delete from public.profiles where id = old.id;

  return old;
end;
$$;

-- 7) Trigger sur auth.users
drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  before delete on auth.users
  for each row execute procedure public.handle_user_delete();

-- 8) Vérification
select tgname, tgrelid::regclass as table_name
from pg_trigger
where tgname = 'on_auth_user_deleted';
