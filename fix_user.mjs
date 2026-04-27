import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fix() {
  const oldId = 'c18d8f8b-65a0-4a92-bc74-075138ca5c1b';
  const newId = '3512b7e5-8f5e-4c62-bf9e-dd6695f1f104';

  // We have a mismatched user.
  // 1. Get the current user from auth.users (newId)
  const { data: authUser, error: getAuthErr } = await adminSupabase.auth.admin.getUserById(newId);
  
  if (getAuthErr) {
    console.error('Cannot find auth user', getAuthErr);
  }

  // Option 2: Delete auth user, and recreate auth user with oldId!
  await adminSupabase.auth.admin.deleteUser(newId);
  console.log('Deleted mismatched auth user.');

  const { data: recreatedUser, error: recreateErr } = await adminSupabase.auth.admin.createUser({
    id: oldId, // force same UUID as public.users
    email: 'aree46773@gmail.com',
    password: 'Password123!', // temporary password
    email_confirm: true,
    user_metadata: { name: '亮', role: 'admin' }
  });

  if (recreateErr) {
    console.error('Failed to recreate auth user with old ID:', recreateErr);
  } else {
    console.log('Successfully recreated auth user with matching ID:', recreatedUser.user.id);
  }
}

fix();
