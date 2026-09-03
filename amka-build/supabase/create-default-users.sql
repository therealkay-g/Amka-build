-- Script pour créer les 15 utilisateurs par défaut
-- IMPORTANT: Vous devez d'abord créer les utilisateurs via l'interface d'authentification Supabase
-- Puis exécuter ce script SQL pour remplir les profils et les utilisateurs dans les tables

-- Pour chaque utilisateur, remplacez par les vrais ID des utilisateurs auth

-- 1. ADMIN
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[ADMIN_USER_ID', 'admin@amka.cd', 'Admin', 'AMKA', 'ADMIN', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[ADMIN_USER_ID]', 'admin@amka.cd', 'Admin', 'AMKA', 'ADMIN', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RECEPTIONNISTE
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[RECEPTIONIST_USER_ID]', 'reception@amka.cd', 'Réceptionniste', 'AMKA', 'RECEPTIONIST', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[RECEPTIONIST_USER_ID]', 'reception@amka.cd', 'Réceptionniste', 'AMKA', 'RECEPTIONIST', true)
ON CONFLICT (id) DO NOTHING;

-- 3. PERCEPTEUR
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[PERCEPTEUR_USER_ID]', 'perception@amka.cd', 'Percepteur', 'AMKA', 'PERCEPTEUR', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[PERCEPTEUR_USER_ID]', 'perception@amka.cd', 'Percepteur', 'AMKA', 'PERCEPTEUR', true)
ON CONFLICT (id) DO NOTHING;

-- 4. PHARMACIEN
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[PHARMACIEN_USER_ID]', 'pharmacy@amka.cd', 'Pharmacien', 'AMKA', 'PHARMACIEN', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[PHARMACIEN_USER_ID]', 'pharmacy@amka.cd', 'Pharmacien', 'AMKA', 'PHARMACIEN', true)
ON CONFLICT (id) DO NOTHING;

-- 5. COMPTABLE
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[COMPTABLE_USER_ID]', 'accounting@amka.cd', 'Comptable', 'AMKA', 'COMPTABLE', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[COMPTABLE_USER_ID]', 'accounting@amka.cd', 'Comptable', 'AMKA', 'COMPTABLE', true)
ON CONFLICT (id) DO NOTHING;

-- 6. MÉDECIN DIRECTEUR
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[MEDECIN_DIRECTEUR_USER_ID]', 'doctor@amka.cd', 'Directeur', 'Médical', 'MEDECIN_DIRECTEUR', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[MEDECIN_DIRECTEUR_USER_ID]', 'doctor@amka.cd', 'Directeur', 'Médical', 'MEDECIN_DIRECTEUR', true)
ON CONFLICT (id) DO NOTHING;

-- 7. ORTHOPÉDISTE
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[ORTHOPEDISTE_USER_ID]', 'orthopediste@amka.cd', 'Orthopédiste', 'AMKA', 'ORTHOPEDISTE', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[ORTHOPEDISTE_USER_ID]', 'orthopediste@amka.cd', 'Orthopédiste', 'AMKA', 'ORTHOPEDISTE', true)
ON CONFLICT (id) DO NOTHING;

-- 8. PSYCHIATRE
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[PSYCHIATRE_USER_ID]', 'psychiatre@amka.cd', 'Psychiatre', 'AMKA', 'PSYCHIATRE', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[PSYCHIATRE_USER_ID]', 'psychiatre@amka.cd', 'Psychiatre', 'AMKA', 'PSYCHIATRE', true)
ON CONFLICT (id) DO NOTHING;

-- 9. LABORANTIN
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[LABORANTIN_USER_ID]', 'laborantin@amka.cd', 'Laborantin', 'AMKA', 'LABORANTIN', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[LABORANTIN_USER_ID]', 'laborantin@amka.cd', 'Laborantin', 'AMKA', 'LABORANTIN', true)
ON CONFLICT (id) DO NOTHING;

-- 10. TECHNICIEN EG
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[TECHNICIEN_EG_USER_ID]', 'techniciensie@amka.cd', 'Technicien', 'EG', 'TECHNICIEN_EG', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[TECHNICIEN_EG_USER_ID]', 'techniciensie@amka.cd', 'Technicien', 'EG', 'TECHNICIEN_EG', true)
ON CONFLICT (id) DO NOTHING;

-- 11. TECHNICIEN ECG
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[TECHNICIEN_ECG_USER_ID]', 'technicecg@amka.cd', 'Technicien', 'ECG', 'TECHNICIEN_ECG', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[TECHNICIEN_ECG_USER_ID]', 'technicecg@amka.cd', 'Technicien', 'ECG', 'TECHNICIEN_ECG', true)
ON CONFLICT (id) DO NOTHING;

-- 12. RADIOLOGUE
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[RADIOLOGUE_USER_ID]', 'radiologue@amka.cd', 'Radiologue', 'AMKA', 'RADIOLOGUE', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[RADIOLOGUE_USER_ID]', 'radiologue@amka.cd', 'Radiologue', 'AMKA', 'RADIOLOGUE', true)
ON CONFLICT (id) DO NOTHING;

-- 13. KINÉSITHÉRAPEUTE
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[KINESITHERAPEUTE_USER_ID]', 'kinesitherapie@amka.cd', 'Kinésithérapeute', 'AMKA', 'KINESITHERAPEUTE', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[KINESITHERAPEUTE_USER_ID]', 'kinesitherapie@amka.cd', 'Kinésithérapeute', 'AMKA', 'KINESITHERAPEUTE', true)
ON CONFLICT (id) DO NOTHING;

-- 14. CHIRURGIEN
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[CHIRURGIEN_USER_ID]', 'chirurgie@amka.cd', 'Chirurgien', 'AMKA', 'CHIRURGIEN', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[CHIRURGIEN_USER_ID]', 'chirurgie@amka.cd', 'Chirurgien', 'AMKA', 'CHIRURGIEN', true)
ON CONFLICT (id) DO NOTHING;

-- 15. INFIRMIER(E)
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[INFIRMIER_USER_ID]', 'infirmerie@amka.cd', 'Infirmier', 'AMKA', 'INFIRMIER', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[INFIRMIER_USER_ID]', 'infirmerie@amka.cd', 'Infirmier', 'AMKA', 'INFIRMIER', true)
ON CONFLICT (id) DO NOTHING;

-- 16. CAISSIER
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES ('[CAISSIER_USER_ID]', 'caissier@amka.cd', 'Caissier', 'AMKA', 'CAISSIER', true);
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES ('[CAISSIER_USER_ID]', 'caissier@amka.cd', 'Caissier', 'AMKA', 'CAISSIER', true)
ON CONFLICT (id) DO NOTHING;
