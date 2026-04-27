import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envConfig = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function createCoach() {
  const email = 'testcoach_trust2@example.com';
  const password = 'password123';
  const name = '測試安心教練';

  // 1. Create auth user
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'coach', name }
  });

  let userId;

  if (authError) {
    if (authError.message.includes('already exists')) {
      console.log('User already exists, trying to fetch ID...');
      const { data } = await adminSupabase.from('users').select('id').eq('email', email).single();
      if(data) userId = data.id;
      else return console.error("Could not find existing user");
    } else {
      console.error('Auth User creation failed:', authError);
      return;
    }
  } else {
    userId = authData.user.id;
    console.log('Auth user created:', userId);
  }

  // 2. Insert into public.users
  const { error: userError } = await adminSupabase.from('users').upsert({
    id: userId,
    email,
    password: 'auth_managed',
    name,
    role: 'coach'
  });

  if (userError) {
    console.error('public.users insertion failed:', userError);
    return;
  }

  // 3. Insert into public.coaches
  const { error: coachError } = await adminSupabase.from('coaches').upsert({
    user_id: userId,
    service_areas: '籃球',
    location: '台北市',
    base_price: 1000,
    experience: '5年教學經驗',
    approval_status: 'approved'
  });

  if (coachError) {
    console.error('public.coaches insertion failed:', coachError);
    return;
  }

  console.log('\n--- Test Coach Created ---');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('--------------------------\n');
}

createCoach();
