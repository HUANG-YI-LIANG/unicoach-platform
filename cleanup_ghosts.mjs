import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: authUsersRes } = await adminSupabase.auth.admin.listUsers();
  const authUserIds = authUsersRes.users.map(u => u.id);

  const { data: publicUsers } = await adminSupabase.from('users').select('id, email');
  
  let deletedCount = 0;
  for (const pUser of publicUsers) {
    if (!authUserIds.includes(pUser.id)) {
      console.log(`Ghost user found in users table: ${pUser.email} (${pUser.id})`);
      await adminSupabase.from('users').delete().eq('id', pUser.id);
      deletedCount++;
    }
  }

  console.log(`Finished. Deleted ${deletedCount} ghost users from public.users`);
}

run();
