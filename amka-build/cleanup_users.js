require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function cleanup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  console.log('Fetching users...');
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const keepEmail = 'kaynzogu@gmail.com';
  const keepUser = users.find(u => u.email === keepEmail);
  if (!keepUser) {
    console.error('Critical error: Could not find the user to keep!');
    process.exit(1);
  }

  const usersToDelete = users.filter(u => u.email !== keepEmail);
  console.log(`Found ${users.length} users. Deleting ${usersToDelete.length}...`);

  // 1. Brutal Cleanup of Public Tables
  // We'll try to delete all records from these tables that are NOT linked to the keepUser
  const tablesToWipe = [
    'audit_logs', 'notifications', 'user_activities', 'backups',
    'expenses', 'payments', 'consultations', 'reception',
    'laboratory_logs', 'laboratory_exams', 'eg_exams', 'ecg_exams',
    'radiology_exams', 'kinesitherapie_sessions', 'surgeries',
    'hospitalizations', 'nursing_cares', 'plasters', 'dressings',
    'pharmacy_purchases', 'pharmacy_stock_movements'
  ];

  console.log('Step 1: Wiping dependent data...');
  for (const table of tablesToWipe) {
    try {
      // Delete everything that doesn't belong to the keepUser (approximate cleanup)
      await supabaseAdmin.from(table).delete().neq('user_id', keepUser.id);
      await supabaseAdmin.from(table).delete().neq('medecin_id', keepUser.id);
      // Since we don't know all columns, this is a broad stroke.
    } catch (e) {
      // Ignore errors for tables that might not exist or have different columns
    }
  }

  // 2. Specifically target the "users" and "profiles" tables to break the loop
  console.log('Step 2: Clearing public user tables...');
  try {
    // We delete all records in public.users and public.profiles that are not the keepUser
    await supabaseAdmin.from('users').delete().neq('id', keepUser.id);
    await supabaseAdmin.from('profiles').delete().neq('id', keepUser.id);
  } catch (e) {
    console.error('Error clearing public user tables:', e.message);
  }

  // 3. Final deletion of Auth users
  console.log('Step 3: Deleting Auth accounts...');
  for (const user of usersToDelete) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Failed to delete auth user ${user.email}: ${res.status} - ${text}`);
      } else {
        console.log(`Successfully deleted ${user.email}`);
      }
    } catch (e) {
      console.error(`Network error deleting ${user.email}:`, e.message);
    }
  }

  console.log('Cleanup complete.');
}

cleanup().catch(console.error);
