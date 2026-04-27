import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: user, error } = await adminSupabase.from('users').select('*').eq('email', 'howard0304@hotmail.com.tw').single();
  if (user) {
    console.log('User exists in users table:', user.id);
    const { data: coach } = await adminSupabase.from('coaches').select('*').eq('user_id', user.id).single();
    if (!coach && user.role === 'coach') {
      console.log('Broken state! Inserting missing coach record...');
      await adminSupabase.from('coaches').insert({ user_id: user.id, approval_status: 'pending', commission_rate: 45, base_price: 1000 });
      console.log('Fixed.');
    } else {
      console.log('Coach record exists or role is not coach.');
    }
  } else {
    console.log('User does not exist.');
  }
}

run();
