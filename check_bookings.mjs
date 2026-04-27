import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await adminSupabase.from('bookings').select('id, user_id, coach_id, status, payment_expires_at, payment_reference').order('created_at', { ascending: false }).limit(5);
  console.log('Error:', error);
  console.log('Bookings:', data);
}

run();
