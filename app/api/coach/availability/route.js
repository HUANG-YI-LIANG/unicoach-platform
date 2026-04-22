import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { minutesToTime, parseAvailableTimes } from '@/lib/coachAvailability';

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

function normalizeRules(rawRules) {
  if (!Array.isArray(rawRules)) {
    return [];
  }

  const rules = [];
  for (const rule of rawRules) {
    const weekday = Number(rule.weekday);
    const start = String(rule.start_time || rule.start || '').slice(0, 5);
    const end = String(rule.end_time || rule.end || '').slice(0, 5);
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new Error('星期資料不合法');
    }
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      throw new Error('時段起訖不合法');
    }
    if ((startMinutes % 30) !== 0 || (endMinutes % 30) !== 0) {
      throw new Error('時段必須以 30 分鐘為單位');
    }

    rules.push({
      weekday,
      start_time: start,
      end_time: end,
      slot_minutes: 30,
      is_active: rule.is_active !== false,
    });
  }

  const activeByWeekday = new Map();
  for (const rule of rules.filter((item) => item.is_active)) {
    const key = String(rule.weekday);
    const items = activeByWeekday.get(key) || [];
    const start = parseTimeToMinutes(rule.start_time);
    const end = parseTimeToMinutes(rule.end_time);
    if (items.some((item) => start < item.end && item.start < end)) {
      throw new Error('同一天不可設定重疊時段');
    }
    items.push({ start, end });
    activeByWeekday.set(key, items);
  }

  return rules
    .sort((left, right) => {
      if (left.weekday !== right.weekday) return left.weekday - right.weekday;
      return left.start_time.localeCompare(right.start_time);
    })
    .map((rule, index) => ({
      ...rule,
      display_order: index,
    }));
}

function legacyRulesFromAvailableTimes(rawValue) {
  return parseAvailableTimes(rawValue).map((rule, index) => ({
    id: `legacy-${rule.weekday}-${rule.startMinutes}-${rule.endMinutes}`,
    weekday: rule.weekday,
    start_time: minutesToTime(rule.startMinutes),
    end_time: minutesToTime(rule.endMinutes),
    slot_minutes: 30,
    is_active: true,
    display_order: index,
    is_legacy: true,
  }));
}

export async function GET() {
  try {
    const auth = await requireAuth(['coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const coachId = auth.user.id;

    const [{ data: rules, error: rulesError }, { data: exceptions, error: exceptionsError }, { data: coach }] = await Promise.all([
      adminSupabase
        .from('coach_availability_rules')
        .select('*')
        .eq('coach_id', coachId)
        .order('display_order', { ascending: true })
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true }),
      adminSupabase
        .from('coach_availability_exceptions')
        .select('*')
        .eq('coach_id', coachId)
        .gte('exception_date', new Date().toISOString().slice(0, 10))
        .order('exception_date', { ascending: true }),
      adminSupabase
        .from('coaches')
        .select('available_times')
        .eq('user_id', coachId)
        .single(),
    ]);

    if (rulesError) throw rulesError;
    if (exceptionsError) throw exceptionsError;

    const activeRules = rules || [];
    const fallbackRules = activeRules.length ? [] : legacyRulesFromAvailableTimes(coach?.available_times);

    return NextResponse.json({
      rules: activeRules.length ? activeRules : fallbackRules,
      exceptions: exceptions || [],
      using_legacy_available_times: activeRules.length === 0 && fallbackRules.length > 0,
    });
  } catch (error) {
    console.error('Availability fetch error:', error);
    return NextResponse.json({ error: '無法取得固定時段' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const rules = normalizeRules(body.rules);
    const adminSupabase = getAdminSupabase();

    const { error: deleteError } = await adminSupabase
      .from('coach_availability_rules')
      .delete()
      .eq('coach_id', auth.user.id);

    if (deleteError) throw deleteError;

    if (rules.length) {
      const { error: insertError } = await adminSupabase
        .from('coach_availability_rules')
        .insert(rules.map((rule) => ({
          coach_id: auth.user.id,
          ...rule,
        })));

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, count: rules.length });
  } catch (error) {
    console.error('Availability update error:', error);
    return NextResponse.json({ error: error.message || '固定時段儲存失敗' }, { status: 400 });
  }
}
