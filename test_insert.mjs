import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data, error } = await adminSupabase.from('users').insert([{
    id: '00000000-0000-0000-0000-000000000000',
    email: 'test@test.com',
    password: 'hash',
    name: 'test',
    role: 'user',
    is_frozen: false
  }]).select();
  
  if (error) {
    console.error('DB Insert Error:', error);
  } else {
    console.log('Success:', data);
    await adminSupabase.from('users').delete().eq('id', '00000000-0000-0000-0000-000000000000');
  }
}

run();
