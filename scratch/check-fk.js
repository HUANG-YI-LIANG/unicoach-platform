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

async function checkConstraints() {
  console.log('--- Checking Constraints for user_files ---');
  // Since we can't run raw SQL, we'll try to use the RCP or information_schema if possible.
  // Actually, we can try to insert a record with a non-existent user_id and see if it fails with FK violation.
  
  const fakeUserId = '00000000-0000-4000-8000-000000000000'; // Invalid UUID probably
  const { error } = await supabase
    .from('user_files')
    .insert([{
        user_id: fakeUserId,
        file_type: 'test',
        verification_status: 'pending'
    }]);

  if (error) {
    console.log('Insert error code:', error.code);
    console.log('Insert error message:', error.message);
    if (error.code === '23503') {
        console.log('✅ Foreign key constraint EXISTS (Violated as expected).');
    } else {
        console.log('❌ Unexpected error or no FK violation.');
    }
  } else {
    console.log('⚠️ Insert SUCCEEDED! This means there is NO foreign key constraint on user_id!');
  }
}

checkConstraints();
