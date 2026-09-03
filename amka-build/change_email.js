require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixEmail() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const newEmail = 'amisiraphael@gmail.com';

  console.log(`Searching for user ${newEmail} in Auth...`);
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const user = users.find(u => u.email === newEmail);

  if (!user) {
    console.error(`User ${newEmail} not found in Auth!`);
    process.exit(1);
  }

  console.log(`Found user ID: ${user.id}. Synchronizing public tables...`);

  try {
    // 1. Update in public.profiles via REST API
    const updateProfile = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return-representation'
      },
      body: JSON.stringify({ email: newEmail })
    });

    if (!updateProfile.ok) {
      const text = await updateProfile.text();
      throw new Error(`Profile update failed: ${updateProfile.status} - ${text}`);
    }
    console.log('✓ Updated in public.profiles');

    // 2. Update in public.users via REST API
    const updateUser = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return-representation'
      },
      body: JSON.stringify({ email: newEmail })
    });

    if (!updateUser.ok) {
      const text = await updateUser.text();
      throw new Error(`Users table update failed: ${updateUser.status} - ${text}`);
    }
    console.log('✓ Updated in public.users');

    console.log(`\nSuccess! Public tables are now synchronized with ${newEmail}.`);
  } catch (e) {
    console.error('Critical error during synchronization:', e.message);
    process.exit(1);
  }
}

fixEmail();
