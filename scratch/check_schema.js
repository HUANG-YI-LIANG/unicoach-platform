const { createClient } = require('@supabase/supabase-js');

async function checkSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables. Use node --env-file=.env.local');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in users table:', Object.keys(data[0]));
  } else {
    console.log('No data in users table.');
  }
}

checkSchema();

