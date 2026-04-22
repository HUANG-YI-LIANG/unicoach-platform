const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of envConfig) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
  }
}
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, '../supabase_migration_phase2.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration SQL...');
    
    // We try to execute using the run_sql RPC function
    const { error } = await supabase.rpc('run_sql', { sql: sqlContent });

    if (error) {
      console.error('Error executing migration:', error);
      // Fallback: If run_sql fails or doesn't support multiple statements, we can run them individually
      console.log('\nTrying to run statements individually...');
      const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        if (stmt.startsWith('--')) continue; // skip pure comments
        console.log(`Executing: ${stmt.substring(0, 50)}...`);
        const { error: stmtErr } = await supabase.rpc('run_sql', { sql: stmt });
        if (stmtErr) {
           console.error('  Failed:', stmtErr.message);
        } else {
           console.log('  Success.');
        }
      }
    } else {
      console.log('Migration executed successfully!');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

runMigration();
