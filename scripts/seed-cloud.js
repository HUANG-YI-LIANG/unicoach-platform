/**
 * UniCoach Cloud Seeding Script (Final Production Version)
 * -------------------------------------------------------
 * This script initializes the Supabase Cloud project with default demo accounts.
 * Run this AFTER applying supabase_schema.sql in the Supabase SQL Editor.
 * 
 * Features:
 * - Idempotent: Can be run multiple times safely.
 * - Uses Service Role Key for administrative bypass.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// 1. Load credentials from .env.local
const envPath = path.join(__dirname, '../.env.local');
let supabaseUrl, supabaseServiceKey;

if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1];
  supabaseServiceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1];
}

// Ensure keys are present
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing credentials in .env.local. Please ensure the file exists and is populated.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEMO_ACCOUNTS = [
  { email: 'admin@unicoach.com', password: 'Admin@2024', name: 'System Admin', role: 'admin' },
  { email: 'coach@unicoach.com', password: 'Coach@2024', name: 'Test Coach', role: 'coach' },
  { email: 'user@unicoach.com', password: 'User@2024', name: 'Test User', role: 'user' }
];

async function seed() {
  console.log('🚀 Starting UniCoach Cloud Seeding...');
  console.log(`Target: ${supabaseUrl}`);

  // Fetch existing users list for idempotency check
  const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();

  for (const acc of DEMO_ACCOUNTS) {
    console.log(`\nProcessing ${acc.email} (${acc.role})...`);

    let userId;
    const existing = existingUsers.find(u => u.email === acc.email);

    if (existing) {
      console.log(`  - Account already exists in Auth. (ID: ${existing.id})`);
      userId = existing.id;
    } else {
      // 1. Create User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { name: acc.name, role: acc.role }
      });

      if (authError) {
        console.error(`  ❌ Auth Error: ${authError.message}`);
        continue;
      }
      userId = authData.user.id;
      console.log(`  ✅ Auth Created: ${userId}`);
    }

    // 2. Upsert Profile in public.users
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: acc.email,
        name: acc.name,
        role: acc.role,
        password: 'SEED_MANAGED_AUTH', // Placeholder since Auth is external
        level: 1,
        is_frozen: false
      });

    if (profileError) {
      console.error(`  ❌ Profile Error: ${profileError.message}`);
    } else {
      console.log(`  ✅ User Profile Synced.`);
    }

    // 3. Special Case: Coach details
    if (acc.role === 'coach') {
      const { error: coachError } = await supabase
        .from('coaches')
        .upsert({
          user_id: userId,
          university: 'NTU',
          location: 'Taipei',
          service_areas: 'Taipei, New Taipei',
          languages: 'Mandarin, English',
          experience: '3 years teaching',
          philosophy: 'Fun and learn',
          target_audience: 'Beginners',
          available_times: 'Weekends',
          base_price: 1500, // Adjusted for cloud demo
          commission_rate: 45,
          approval_status: 'approved',
          bio: '你好！我是 Test Coach，由雲端腳本自動啟用的教練帳號。'
        });

      if (coachError) {
        console.error(`  ❌ Coach Data Error: ${coachError.message}`);
      } else {
        console.log(`  ✅ Coach Data Created & Approved.`);
      }
    }
  }

  console.log('\n✨ Seeding completed!');
  console.log('--------------------------------------------------');
  console.log('Credentials for Testing:');
  DEMO_ACCOUNTS.forEach(a => console.log(`- ${a.role.padEnd(6)}: ${a.email} / ${a.password}`));
  console.log('--------------------------------------------------');
}

seed().catch(err => {
  console.error('Fatal Error:', err);
});
