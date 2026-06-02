import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  const { data: users, error } = await supabase.from('users').select('*');
  if (error) return NextResponse.json({ error }, { status: 500 });
  
  let deleted = [];
  const keepEmails = [
    'validation-court@unicoach.tw',
    'validation-companion@unicoach.tw',
    'validation-beginner@unicoach.tw',
    'validation-score@unicoach.tw',
    'validation-fitness@unicoach.tw',
    'coach1@test.com' // admin/test if needed? user said ONLY keep these 5 validation
  ];
  
  for (const u of users) {
    if (!keepEmails.includes(u.email)) {
      deleted.push(u.email);
      await supabase.auth.admin.deleteUser(u.id);
      await supabase.from('users').delete().eq('id', u.id);
    }
  }

  return NextResponse.json({ deleted });
}
