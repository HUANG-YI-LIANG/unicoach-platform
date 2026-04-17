const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  'https://sudwmlrfhbopkgisvnqv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0'
);

const accounts = [
  { email: 'admin@test.com', name: '最高管理員', role: 'admin' },
  { email: 'coach@test.com', name: '王牌教練', role: 'coach' },
  { email: 'user@test.com', name: '一般用戶', role: 'user' }
];

async function seed() {
  for (const acc of accounts) {
    console.log('Seeding ' + acc.email + '...');
    const password = '123456';
    
    // Create auth account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: password,
      email_confirm: true
    });
    
    let authId;
    if (authError && authError.message.includes('already registered')) {
      const { data: list } = await supabase.auth.admin.listUsers();
      authId = list.users.find(u => u.email === acc.email).id;
    } else if (authError) {
      console.error(authError.message);
      continue;
    } else {
      authId = authData.user.id;
    }

    const hash = await bcrypt.hash(password, 10);

    // Create public user (upsert ignores if exists because we don't have true upsert config, we'll try insert and ignore error)
    const { error: userError } = await supabase.from('users').insert([{
      id: authId, email: acc.email, password: hash, name: acc.name, role: acc.role, level: 1
    }]);

    if (acc.role === 'coach' && !userError) {
      await supabase.from('coaches').insert([{ user_id: authId, base_price: 1000, commission_rate: 45 }]);
    }
  }
  console.log('Seed completed.');
}

seed();
