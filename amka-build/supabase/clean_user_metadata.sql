-- Script pour nettoyer les métadonnées utilisateur qui causent l'erreur 431
-- Exécute ceci dans l'éditeur SQL de Supabase

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    raw_user_meta_data::jsonb,
    '{avatar_url}',
    'null'::jsonb
)
WHERE email = 'kaynzogu@gmail.com';

-- Met aussi à jour le rôle et les infos de base
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'first_name', 'Dr.raphael',
    'last_name', 'Amisi',
    'role', 'ADMIN',
    'is_active', true,
    'avatar_url', null,
    'phone', null
)
WHERE email = 'kaynzogu@gmail.com';

-- Vérifie le résultat
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE email = 'kaynzogu@gmail.com';
