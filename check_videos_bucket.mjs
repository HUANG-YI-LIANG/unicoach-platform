import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function checkAndCreateBucket() {
  const bucketName = 'coach-videos';
  const { data, error } = await adminSupabase.storage.getBucket(bucketName);
  
  if (error && error.message.includes('not found')) {
    console.log(`Bucket ${bucketName} not found. Creating it...`);
    const { data: createData, error: createError } = await adminSupabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 524288000, // 500MB
    });
    
    if (createError) {
      console.error('Failed to create bucket:', createError);
    } else {
      console.log('Bucket created successfully:', createData);
    }
  } else if (error) {
    console.error('Error checking bucket:', error);
  } else {
    console.log(`Bucket ${bucketName} already exists. Updating its settings just in case...`);
    const { data: updateData, error: updateError } = await adminSupabase.storage.updateBucket(bucketName, {
      public: true,
      fileSizeLimit: 524288000, // 500MB
    });
    if (updateError) {
      console.error('Failed to update bucket:', updateError);
    } else {
      console.log('Bucket updated successfully.');
    }
  }
}

checkAndCreateBucket();
