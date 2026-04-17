const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
  console.log('Checking columns for "coaches" table...');
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching coaches:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in "coaches":', Object.keys(data[0]));
  } else {
    console.log('No data in "coaches" table to check columns. Trying to insert and then rollback or just querying information_schema...');
    
    // Better way: query information_schema
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'coaches' });
    
    if (colError) {
        console.log('Fallback: RPC not available, trying to select from information_schema via regular query (might fail due to RLS if not using service key)');
        // Note: supabase-js doesn't support raw SQL, so we rely on the first check or another method.
        // Let's just try to check for verified_at specifically.
        const { error: verifyError } = await supabase.from('coaches').select('verified_at').limit(1);
        if (verifyError) {
            console.log('❌ verified_at DOES NOT exist in coaches table');
        } else {
            console.log('✅ verified_at exists in coaches table');
        }

        const { error: verifyByError } = await supabase.from('coaches').select('verified_by').limit(1);
        if (verifyByError) {
            console.log('❌ verified_by DOES NOT exist in coaches table');
        } else {
            console.log('✅ verified_by exists in coaches table');
        }
    } else {
        console.log('Columns:', cols);
    }
  }
}

checkColumns();
