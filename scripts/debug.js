const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sudwmlrfhbopkgisvnqv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjA5NDUsImV4cCI6MjA5MTIzNjk0NX0.pZiNap7DlbSvjM6593P8TL8xluD7LoYoN1tMUqOn_VQ'
);

async function run() {
  console.log('Testing /api/coaches query...');
  const { data, error } = await supabase
    .from('coaches')
    .select('*, users!inner(id, name, email, phone, avatar_url)');
  
  if (error) {
    console.error('Coaches fetch error:', error.message);
  } else {
    console.log('Coaches fetch success', data);
  }

  console.log('Testing registration insert...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([{ email: 'test_coach@test.com', password: 'hash', name: 'Test Coach', role: 'coach' }])
    .select('id')
    .single();

  if (userError) {
    console.error('Registration error:', userError.message);
  } else {
    console.log('Registration success', user);
    
    const { error: tsError } = await supabase.from('terms_consents').insert([{ user_id: user.id, terms_version: '1.0' }]);
    if (tsError) console.error('Terms error:', tsError.message);
    
    const { error: coachError } = await supabase.from('coaches').insert([{ user_id: user.id, base_price: 1000, commission_rate: 45 }]);
    if (coachError) console.error('Coach insert error:', coachError.message);
    
    // Clean up
    await supabase.from('users').delete().eq('id', user.id);
  }
}

run();
