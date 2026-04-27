import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('Fetching users...');
  const { data: { users }, error } = await adminSupabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log(`Found ${users.length} users.`);

  let kept = 0;
  let deleted = 0;

  for (const user of users) {
    // Keep 'aree46773@gmail.com'
    if (user.email === 'aree46773@gmail.com') {
      console.log(`Keeping real admin account: ${user.email}`);
      
      // Make sure this account is actually an admin in the public schema
      const { error: updateErr } = await adminSupabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', user.id);
        
      if (updateErr) console.error('Failed to make real admin:', updateErr);
      else console.log(`Ensured ${user.email} is admin.`);
      
      kept++;
      continue;
    }
    
    // If the real admin doesn't exist yet, we should keep admin@test.com just in case
    const hasRealAdmin = users.some(u => u.email === 'aree46773@gmail.com');
    if (!hasRealAdmin && user.email === 'admin@test.com') {
      console.log(`Keeping fallback admin account: ${user.email}`);
      kept++;
      continue;
    }

    console.log(`Deleting ${user.email}...`);
    const { error: delErr } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error(`Failed to delete ${user.email}:`, delErr);
    } else {
      deleted++;
    }
  }

  console.log(`Done. Deleted: ${deleted}, Kept: ${kept}`);
}

run();
