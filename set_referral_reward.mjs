import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('platform_settings')
    .upsert({
      key: 'referral_reward_amount',
      value: '500',
      description: '完課時自動發放給推薦人的獎勵金額'
    }, { onConflict: 'key' });

  if (error) {
    console.error('Error setting referral_reward_amount:', error);
  } else {
    console.log('Successfully set referral_reward_amount to 500');
  }
}

run();
