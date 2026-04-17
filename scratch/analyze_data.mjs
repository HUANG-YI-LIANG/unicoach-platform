import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for full access
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
  console.log('--- Analyzing Coaches Data ---');
  
  // 1. Fetch all coaches and their linked user data
  const { data: coaches, error } = await supabase
    .from('coaches')
    .select('*, users(id, name, email, role)');
    
  if (error) {
    console.error('Error fetching coaches:', error);
    return;
  }

  const issues = [];

  for (const coach of coaches) {
    const coachIssues = [];
    
    // Check if user exists
    if (!coach.users) {
      coachIssues.push(`Missing linked user record for coach (ID: ${coach.id}, UserID: ${coach.user_id})`);
    } else {
      // Check for name mismatch
      if (coach.name !== coach.users.name) {
        coachIssues.push(`Name mismatch: Coach table says "${coach.name}", User table says "${coach.users.name}"`);
      }
    }

    // Check service_areas for non-standard separators
    if (coach.service_areas) {
      const weirdSeparators = /[、;；]/.test(coach.service_areas);
      const mixedSeparators = coach.service_areas.includes(',') && coach.service_areas.includes(' ');
      if (weirdSeparators || (coach.service_areas.includes(' ') && !coach.service_areas.includes(','))) {
        coachIssues.push(`Non-standard service_areas format: "${coach.service_areas}" (Use only comma separator)`);
      }
    } else {
      coachIssues.push('service_areas is missing');
    }

    // Check price
    if (coach.base_price === undefined || coach.base_price === null || coach.base_price === 0) {
      coachIssues.push(`Base price is missing or zero: ${coach.base_price}`);
    }

    // Check bio/intro
    if (!coach.intro || coach.intro.length < 10) {
      coachIssues.push('Introduction is too short or missing');
    }

    if (coachIssues.length > 0) {
      issues.push({
        id: coach.id,
        name: coach.name,
        user_id: coach.user_id,
        issues: coachIssues,
        rawData: coach
      });
    }
  }

  console.log(JSON.stringify(issues, null, 2));
}

analyze();
