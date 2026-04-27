const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const r1 = await supabase.from('coach_availability_rules').select('*').limit(1);
  console.log('rules:', r1.error ? r1.error.message : 'OK');
  const r2 = await supabase.from('coach_availability_exceptions').select('*').limit(1);
  console.log('exceptions:', r2.error ? r2.error.message : 'OK');
}
test();
