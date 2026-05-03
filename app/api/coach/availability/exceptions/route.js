import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import {
  findOverlappingAvailabilityException,
  isAvailabilityExceptionOverlapError,
  sanitizeAvailabilityException,
} from '@/lib/availabilityRules';

export async function POST(request) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const sanitized = sanitizeAvailabilityException(body);
    if (sanitized.error) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data: existingExceptions, error: existingError } = await adminSupabase
      .from('coach_availability_exceptions')
      .select('id, exception_date, exception_type, start_time, end_time')
      .eq('coach_id', auth.user.id)
      .eq('exception_date', sanitized.value.exception_date);

    if (existingError) throw existingError;

    const overlappingException = findOverlappingAvailabilityException(sanitized.value, existingExceptions || []);
    if (overlappingException) {
      return NextResponse.json({ error: '同一天不可設定重疊例外時段' }, { status: 409 });
    }

    const { data: exception, error } = await adminSupabase
      .from('coach_availability_exceptions')
      .insert([{
        coach_id: auth.user.id,
        ...sanitized.value,
      }])
      .select('*')
      .single();

    if (error) {
      if (isAvailabilityExceptionOverlapError(error)) {
        return NextResponse.json({ error: '同一天不可設定重疊例外時段' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, exception });
  } catch (error) {
    console.error('Availability exception create error:', error);
    return NextResponse.json({ error: '例外時段建立失敗' }, { status: 500 });
  }
}
