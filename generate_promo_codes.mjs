import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envConfig = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function backfillPromoCodes() {
  console.log('Fetching users without promotion_code...');
  
  // Try to fetch users. If promotion_code doesn't exist yet, this will throw an error,
  // which implies the SQL migration hasn't been run yet.
  const { data: users, error } = await supabase
    .from('users')
    .select('id, promotion_code');
    
  if (error) {
    console.error('Error fetching users. Did you run the SQL migration?');
    console.error(error);
    process.exit(1);
  }

  const usersWithoutCode = users.filter(u => !u.promotion_code);
  console.log(`Found ${usersWithoutCode.length} users needing a code.`);

  let updatedCount = 0;
  for (const user of usersWithoutCode) {
    let success = false;
    let retries = 0;
    while (!success && retries < 5) {
      const newCode = generateCode();
      const { error: updateError } = await supabase
        .from('users')
        .update({ promotion_code: newCode })
        .eq('id', user.id);
        
      if (!updateError) {
        success = true;
        updatedCount++;
        console.log(`User ${user.id} -> ${newCode}`);
      } else {
        // Might be a unique constraint violation, retry
        retries++;
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} users.`);
}

backfillPromoCodes();
