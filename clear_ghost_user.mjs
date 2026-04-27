import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'howard0304@hotmail.com.tw';
  
  // Find in auth.users
  const { data: usersData } = await adminSupabase.auth.admin.listUsers();
  const authUser = usersData.users.find(u => u.email === email);
  if (authUser) {
    await adminSupabase.auth.admin.deleteUser(authUser.id);
    console.log('Deleted auth user:', authUser.id);
  }

  // Find in users
  const { data: user } = await adminSupabase.from('users').select('*').eq('email', email).single();
  if (user) {
    await adminSupabase.from('users').delete().eq('id', user.id);
    console.log('Deleted public.users record:', user.id);
  }
}

run();
