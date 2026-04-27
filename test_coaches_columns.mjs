import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error } = await adminSupabase.from('coaches').insert([{ user_id: '00000000-0000-0000-0000-000000000000', verification_status: 'pending' }]);
  console.log('Error verification_status:', error);

  const { error: error2 } = await adminSupabase.from('coaches').insert([{ user_id: '00000000-0000-0000-0000-000000000000', approval_status: 'pending' }]);
  console.log('Error approval_status:', error2);
}

run();
