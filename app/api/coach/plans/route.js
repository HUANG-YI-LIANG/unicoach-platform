import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { buildDefaultPlans, normalizePlan } from '@/lib/coachPlans';

function sanitizePlanInput(body) {
  const title = String(body.title || '').trim();
  const durationMinutes = Number(body.duration_minutes);
  const price = Number(body.price);

  if (!title) return { error: '請填寫方案名稱' };
  if (![30, 45, 60, 75, 90, 120, 150, 180].includes(durationMinutes)) {
    return { error: '課程長度不合法' };
  }
  if (!Number.isFinite(price) || price < 100 || price > 50000) {
    return { error: '方案價格不合法' };
  }

  return {
    value: {
      title,
      description: body.description ? String(body.description).trim() : '',
      duration_minutes: durationMinutes,
      price: Math.round(price),
      is_active: body.is_active !== false,
    },
  };
}

export async function GET() {
  try {
    const auth = await requireAuth(['coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const coachId = auth.user.id;

    const { data: coach, error: coachError } = await adminSupabase
      .from('coaches')
      .select('base_price')
      .eq('user_id', coachId)
      .single();

    if (coachError || !coach) {
      return NextResponse.json({ error: '找不到教練資料' }, { status: 404 });
    }

    const { data: plans, error: planError } = await adminSupabase
      .from('coach_plans')
      .select('*')
      .eq('coach_id', coachId)
      .order('display_order', { ascending: true })
      .order('duration_minutes', { ascending: true });

    if (planError) throw planError;

    const normalizedPlans = (plans || []).map(normalizePlan);
    return NextResponse.json({
      plans: normalizedPlans.length ? normalizedPlans : buildDefaultPlans(coachId, coach.base_price),
      using_defaults: normalizedPlans.length === 0,
    });
  } catch (error) {
    console.error('Coach plans fetch error:', error);
    return NextResponse.json({ error: '無法取得方案資料' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const sanitized = sanitizePlanInput(body);
    if (sanitized.error) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data: coach } = await adminSupabase
      .from('coaches')
      .select('user_id')
      .eq('user_id', auth.user.id)
      .single();

    if (!coach) {
      return NextResponse.json({ error: '找不到教練資料' }, { status: 404 });
    }

    const { data: existingPlans } = await adminSupabase
      .from('coach_plans')
      .select('id')
      .eq('coach_id', auth.user.id);

    const { data: plan, error } = await adminSupabase
      .from('coach_plans')
      .insert([{
        coach_id: auth.user.id,
        ...sanitized.value,
        display_order: existingPlans?.length || 0,
      }])
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, plan: normalizePlan(plan) });
  } catch (error) {
    console.error('Coach plan create error:', error);
    return NextResponse.json({ error: '方案建立失敗' }, { status: 500 });
  }
}
