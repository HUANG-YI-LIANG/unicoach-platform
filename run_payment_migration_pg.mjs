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
    console.error('No POSTGRES_URL found in .env.local');
    return;
  }
  
  const pool = new Pool({
    connectionString: POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sql = fs.readFileSync('supabase_migration_payment_fields.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration executed successfully.');
  } catch (err) {
    console.error('Error executing migration:', err);
  } finally {
    await pool.end();
  }
}

run();
