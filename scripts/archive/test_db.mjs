import { createClient } from '@supabase/supabase-js';

// Using anon key just like the API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: coaches, error: cErr } = await supabase.from('coaches').select('user_id, service_areas');
  console.log('Coaches table:', coaches, cErr);
  
  const { data: users, error: uErr } = await supabase.from('users').select('id, name, role');
  console.log('Users table:', users, uErr);
  
  const { data: join, error: jErr } = await supabase.from('coaches').select('*, users!inner(id, name, email, phone)');
  console.log('Join result:', join, jErr);
}
test();
