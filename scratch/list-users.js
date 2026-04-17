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

async function listUsers() {
  console.log('--- Current Users in Database ---');
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.table(data);
  
  console.log('\n--- Coaches and Status ---');
  const { data: coaches, error: coachError } = await supabase
    .from('coaches')
    .select(`
      user_id,
      approval_status,
      user:users(name, email)
    `);

  if (coachError) {
    console.error('Error fetching coaches:', coachError);
    return;
  }

  const coachList = coaches.map(c => ({
    name: c.user?.name,
    email: c.user?.email,
    status: c.approval_status,
    id: c.user_id
  }));
  console.table(coachList);

  console.log('\n--- Pending Verifications (user_files) ---');
  const { data: files, error: fileError } = await supabase
    .from('user_files')
    .select(`
      id,
      user_id,
      file_type,
      verification_status,
      user:users(name)
    `)
    .eq('verification_status', 'pending');

  if (fileError) {
    console.error('Error fetching files:', fileError);
    return;
  }
  
  const fileList = files.map(f => ({
    id: f.id,
    user: f.user?.name,
    type: f.file_type,
    status: f.verification_status
  }));
  console.table(fileList);
}

listUsers();
