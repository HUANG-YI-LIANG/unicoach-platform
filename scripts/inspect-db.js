const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTable(tableName) {
  console.log(`Inspecting ${tableName}...`);
  // Use a query that returns columns info (this is a hack, just query for one row and look at keys)
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error querying ${tableName}:`, error.message);
  } else if (data && data.length > 0) {
    console.log(`Columns in ${tableName}:`, Object.keys(data[0]));
  } else {
    // If no rows, we might need another way.
    // Try to insert a mock and rollback? No.
    console.log(`No rows in ${tableName} to inspect columns.`);
  }
}

inspectTable('audit_logs');
inspectTable('user_files');
inspectTable('users');
