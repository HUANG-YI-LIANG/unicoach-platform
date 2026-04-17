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

async function checkStorageBuckets() {
  console.log('--- Checking Storage Buckets ---');
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    console.log('Existing Buckets:');
    buckets.forEach(b => console.log(`- ${b.name} (Public: ${b.public})`));
  }

  const requiredBuckets = ['avatars', 'verifications', 'coach-videos'];
  for (const bucketName of requiredBuckets) {
    const bucket = buckets?.find(b => b.name === bucketName);
    if (!bucket) {
      console.log(`❌ Bucket "${bucketName}" is MISSING!`);
    } else if (!bucket.public) {
      console.log(`⚠️ Bucket "${bucketName}" is NOT PUBLIC!`);
    } else {
      console.log(`✅ Bucket "${bucketName}" is ready.`);
    }
  }
}

async function testUpload() {
    console.log('\n--- Testing Storage Upload (Dry Run) ---');
    // We'll try to list files in a bucket to see if we have access
    const { data, error } = await supabase.storage.from('avatars').list();
    if (error) {
        console.error('Error accessing "avatars" bucket:', error);
    } else {
        console.log('✅ Access to "avatars" bucket confirmed.');
    }
}

async function checkForeignKey() {
    console.log('\n--- Checking ForeignKey via Table Query ---');
    // Try to query user_files and see if it has user_id
    const { data, error } = await supabase.from('user_files').select('user_id').limit(1);
    if (error) {
        console.error('Error selecting user_id from user_files:', error);
    } else {
        console.log('✅ user_id column exists in user_files.');
    }

    // Try the join again without the explicit hint
    const { data: joinData, error: joinError } = await supabase
        .from('user_files')
        .select('id, user_id, users(name)')
        .limit(1);
    
    if (joinError) {
        console.error('❌ Join query failed:', joinError.message);
        console.log('Details:', joinError.details);
    } else {
        console.log('✅ Join query successful!');
    }
}

async function runAll() {
    await checkStorageBuckets();
    await testUpload();
    await checkForeignKey();
}

runAll();
