import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: usersData } = await adminSupabase.auth.admin.listUsers();
  const user = usersData.users.find(u => u.email === 'aree46773@gmail.com');
  
  if (!user) {
    console.log('User not found in auth.users!');
    return;
  }

  console.log('User found:', user.id);

  const { data: profile } = await adminSupabase.from('users').select('*').eq('id', user.id).single();
  if (profile) {
    console.log('Profile exists:', profile);
    return;
  }

  console.log('Profile missing. Trying to insert...');
  const { error } = await adminSupabase.from('users').insert([{
    id: user.id,
    email: user.email,
    password: 'dummy_password',
    name: user.user_metadata?.name || user.email.split('@')[0],
    role: user.user_metadata?.role || 'user', 
    level: 1,
    is_frozen: false,
    created_at: new Date().toISOString()
  }]);

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success!');
  }
}

run();
