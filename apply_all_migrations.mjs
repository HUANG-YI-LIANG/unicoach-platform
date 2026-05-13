import { Pool } from 'pg';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const POSTGRES_URL = envConfig.POSTGRES_URL || envConfig.DATABASE_URL;

async function run() {
  if (!POSTGRES_URL) {
    console.error('No POSTGRES_URL found');
    return;
  }
  
  const pool = new Pool({
    connectionString: POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const files = [
    'supabase_migration_referral_code.sql',
    'supabase_migration_booking_safety.sql',
    'supabase_migration_booking_completion.sql',
    'supabase_migration_cancel_fault.sql'
  ];

  for (const file of files) {
    try {
      console.log(`Executing ${file}...`);
      const sql = fs.readFileSync(file, 'utf8');
      await pool.query(sql);
      console.log(`Successfully executed ${file}\n`);
    } catch (err) {
      console.error(`Error in ${file}:`, err.message);
      break;
    }
  }
  
  await pool.end();
}

run();
