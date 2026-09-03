-- ============================================
-- SCRIPT DE RÉINITIALISATION COMPLÈTE DES DONNÉES
-- ============================================
-- Attention : Ce script SUPPRIME TOUTES les données !
-- ============================================

-- Désactiver temporairement les contraintes de clé étrangère
SET session_replication_role = 'replica';

-- Vider les tables dans l'ordre correct (pour éviter les erreurs de FK)
TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_activities RESTART IDENTITY CASCADE;
TRUNCATE TABLE backups RESTART IDENTITY CASCADE;
TRUNCATE TABLE pharmacy_stock_movements RESTART IDENTITY CASCADE;
TRUNCATE TABLE pharmacy_purchases RESTART IDENTITY CASCADE;
TRUNCATE TABLE sales RESTART IDENTITY CASCADE;
TRUNCATE TABLE pharmacy_suppliers RESTART IDENTITY CASCADE;
TRUNCATE TABLE dressings RESTART IDENTITY CASCADE;
TRUNCATE TABLE plasters RESTART IDENTITY CASCADE;
TRUNCATE TABLE nursing_cares RESTART IDENTITY CASCADE;
TRUNCATE TABLE hospitalizations RESTART IDENTITY CASCADE;
TRUNCATE TABLE surgeries RESTART IDENTITY CASCADE;
TRUNCATE TABLE kinesitherapie_sessions RESTART IDENTITY CASCADE;
TRUNCATE TABLE radiology_exams RESTART IDENTITY CASCADE;
TRUNCATE TABLE ecg_exams RESTART IDENTITY CASCADE;
TRUNCATE TABLE eg_exams RESTART IDENTITY CASCADE;
TRUNCATE TABLE laboratory_exams RESTART IDENTITY CASCADE;
TRUNCATE TABLE reception RESTART IDENTITY CASCADE;
TRUNCATE TABLE expenses RESTART IDENTITY CASCADE;
TRUNCATE TABLE payments RESTART IDENTITY CASCADE;
TRUNCATE TABLE consultations RESTART IDENTITY CASCADE;
TRUNCATE TABLE medications RESTART IDENTITY CASCADE;
TRUNCATE TABLE patients RESTART IDENTITY CASCADE;

-- Important : Garder les utilisateurs (ne pas vider profiles et users !
-- TRUNCATE TABLE profiles RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- Réactiver les contraintes
SET session_replication_role = 'origin';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Toutes les données ont été réinitialisées avec succès !';
END
$$;
