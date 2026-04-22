import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

function parseTimeToMinutes(timeText) {
  if (!timeText || typeof timeText !== 'string' || !timeText.includes(':')) {
    return null;
  }
  const [hoursText, minutesText] = timeText.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function sanitizeException(body) {
  const date = String(body.exception_date || body.date || '').slice(0, 10);
  const type = String(body.exception_type || body.type || '');
  const startTime = String(body.start_time || body.start || '').slice(0, 5);
  const endTime = String(body.end_time || body.end || '').slice(0, 5);
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: '請選擇日期' };
  }
  if (!['available', 'unavailable'].includes(type)) {
    return { error: '例外類型不合法' };
  }
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return { error: '例外時段起訖不合法' };
  }
  if ((startMinutes % 30) !== 0 || (endMinutes % 30) !== 0) {
    return { error: '例外時段必須以 30 分鐘為單位' };
  }

  return {
    value: {
      exception_date: date,
      exception_type: type,
      start_time: startTime,
      end_time: endTime,
      reason: body.reason ? String(body.reason).trim().slice(0, 120) : '',
    },
  };
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const sanitized = sanitizeException(body);
    if (sanitized.error) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data: exception, error } = await adminSupabase
      .from('coach_availability_exceptions')
      .insert([{
        coach_id: auth.user.id,
        ...sanitized.value,
      }])
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, exception });
  } catch (error) {
    console.error('Availability exception create error:', error);
    return NextResponse.json({ error: '例外時段建立失敗' }, { status: 500 });
  }
}
