export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET() {
  const adminSupabase = getAdminSupabase();
  const { data: coaches } = await adminSupabase.from('coaches').select('user_id, available_times, users!inner(name)').ilike('users.name', '%黃%');
  const results = [];
  for (const coach of coaches) {
    const { data: rules } = await adminSupabase.from('coach_availability_rules').select('*').eq('coach_id', coach.user_id);
    const { data: exceptions } = await adminSupabase.from('coach_availability_exceptions').select('*').eq('coach_id', coach.user_id);
    results.push({ coach, rules, exceptions });
  }
  return NextResponse.json({ results });
}
