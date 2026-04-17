const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const adminSupabase = createClient(
  'https://sudwmlrfhbopkgisvnqv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0'
);

async function test() {
  const email = 'test_real_4@test.com';
  const role = 'user';
  const password = 'password123';
  const name = 'Real Test';

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError && !authError.message.includes('already registered')) {
    console.error('Auth Error:', authError);
    return;
  }

  let authUser = authData?.user;
  if (!authUser) {
    const { data: existingAuth } = await adminSupabase.auth.admin.listUsers();
    authUser = existingAuth.users.find(u => u.email === email);
  }

  const hash = await bcrypt.hash(password, 10);
  
  console.log('Attempting to insert into users...', { id: authUser.id, email, name, role, hashLength: hash.length });
  
  const { data: user, error: userError } = await adminSupabase
    .from('users')
    .insert([{ id: authUser.id, email, password: hash, name, phone: '', role: role, level: 1 }])
    .select('id')
    .single();

  if (userError) {
    console.error('User Insert Error:', userError);
  } else {
    console.log('User Insert Success:', user);
  }
}

test();
