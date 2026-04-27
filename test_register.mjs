import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function simulateRegister() {
  const email = 'howard_test1234@hotmail.com.tw';
  const password = 'Password123!';
  const name = '丁禹皓';
  const role = 'coach';
  const age = 20;

  // 3. 建立 Supabase Auth 帳戶
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role }
  });

  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }
  
  console.log('Auth success:', authData.user.id);

  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. 建立用戶 Profile (users 表)
  const userData = {
    id: authData.user.id,
    email,
    password: hashedPassword,
    name,
    role,
    age,
    is_minor: false,
    is_email_verified: false,
    is_frozen: false,
    level: 1,
    created_at: new Date().toISOString()
  };

  const { data: userProfile, error: profileError } = await adminSupabase
    .from('users')
    .insert([userData])
    .select('*')
    .single();

  if (profileError) {
    console.error('Profile Error:', profileError);
    return;
  }
  
  console.log('Profile success.');

  // 5. 核心記錄：法律同意存檔 (terms_consents)
  const { error: consentError } = await adminSupabase
    .from('terms_consents')
    .insert([{
      user_id: authData.user.id,
      consent_type: 'registration',
      terms_version: 'v1.0.2024.Apr',
      privacy_version: 'v1.0.2024.Apr',
      disclaimer_version: 'v1.0.2024.Apr',
      accepted_terms: true,
      accepted_privacy: true,
      accepted_disclaimer: true,
      is_minor: false,
      guardian_consent: false,
      consent_timestamp: new Date().toISOString(),
      user_agent: 'test',
      ip_address: '127.0.0.1'
    }]);

  if (consentError) {
    console.error('Consent Error:', consentError);
    return;
  }

  console.log('Consent success.');

  // 6. 教練專屬初始化
  if (role === 'coach') {
    const { error: coachError } = await adminSupabase
      .from('coaches')
      .insert([{
        user_id: authData.user.id,
        verification_status: 'pending',
        commission_rate: null,
        base_price: 1000
      }]);
    if (coachError) {
      console.error('Coach Error:', coachError);
      return;
    }
  }

  console.log('Coach success.');
}

simulateRegister();
