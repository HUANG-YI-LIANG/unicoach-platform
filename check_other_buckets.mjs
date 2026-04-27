import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const adminSupabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const checkOrCreate = async (name) => {
    const { data, error } = await adminSupabase.storage.getBucket(name);
    if (error && error.message.includes('Bucket not found')) {
      console.log(`Creating bucket ${name}...`);
      await adminSupabase.storage.createBucket(name, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'],
        fileSizeLimit: 5242880 // 5MB
      });
      console.log(`Created bucket ${name}`);
    } else {
      console.log(`Bucket ${name} exists.`);
    }
  };

  await checkOrCreate('avatars');
  await checkOrCreate('verifications');
}

run();
