const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabase() {
  console.log('Checking Supabase connection...');
  const { data, error } = await supabase.from('users').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log('Successfully fetched users. Sample:', data[0]);
  
  // Try to find if columns exist
  const { data: colData, error: colError } = await supabase.from('users').select('age, is_minor, is_email_verified, is_frozen').limit(1);
  if (colError) {
    console.error('Missing columns or other error:', colError.message);
  } else {
    console.log('Required columns exist!');
  }
}

checkSupabase();
