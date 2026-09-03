-- Met à jour le rôle de l'utilisateur avec l'email kayntogu@gmail.com en ADMIN
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'first_name', 'Dr.raphael',
  'last_name', 'Amisi',
  'role', 'ADMIN',
  'is_active', true
)
WHERE email = 'kayntogu@gmail.com';

-- Vérifie le résultat
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'kayntogu@gmail.com';
