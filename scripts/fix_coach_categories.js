const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    envVars[key.trim()] = values.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function determineCategory(text) {
  if (!text) return 'sports';
  const academicKeywords = ['數學', '英文', '理化', '國文', '物理', '化學', '生物', '社會', '歷史', '地理', '公民', '寫作', '全科', '伴讀', '國小', '國中', '高中', '多益', '雅思', '托福', '學測', '會考', '程式'];
  const talentKeywords = ['鋼琴', '吉他', '音樂', '歌唱', '繪畫', '舞蹈', '才藝', '聲樂', '畫畫', '素描'];
  
  if (academicKeywords.some(kw => text.includes(kw))) return 'academic';
  if (talentKeywords.some(kw => text.includes(kw))) return 'talent';
  return 'sports';
}

async function fixCategories() {
  const { data: services, error } = await supabase.from('coach_services').select('id, subject_or_sport, category');
  if (error) {
    console.error('Error fetching services:', error);
    return;
  }

  let updatedCount = 0;
  for (const svc of services) {
    const newCategory = determineCategory(svc.subject_or_sport);
    if (svc.category !== newCategory) {
      console.log(`Updating service ${svc.id} (${svc.subject_or_sport}): ${svc.category} -> ${newCategory}`);
      await supabase.from('coach_services').update({ category: newCategory }).eq('id', svc.id);
      updatedCount++;
    }
  }

  console.log(`Finished updating ${updatedCount} services.`);
}

fixCategories();
