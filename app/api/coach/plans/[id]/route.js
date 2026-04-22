import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { normalizePlan } from '@/lib/coachPlans';

function sanitizePatch(body) {
  const updates = {};

  if (body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) return { error: '請填寫方案名稱' };
    updates.title = title;
  }

  if (body.description !== undefined) {
    updates.description = body.description ? String(body.description).trim() : '';
  }

  if (body.duration_minutes !== undefined) {
    const durationMinutes = Number(body.duration_minutes);
    if (![30, 45, 60, 75, 90, 120, 150, 180].includes(durationMinutes)) {
      return { error: '課程長度不合法' };
    }
    updates.duration_minutes = durationMinutes;
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 100 || price > 50000) {
      return { error: '方案價格不合法' };
    }
    updates.price = Math.round(price);
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (body.display_order !== undefined) {
    updates.display_order = Number(body.display_order) || 0;
  }

  return { value: updates };
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const body = await request.json();
    const sanitized = sanitizePatch(body);
    if (sanitized.error) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data: plan, error } = await adminSupabase
      .from('coach_plans')
      .update(sanitized.value)
      .eq('id', id)
      .eq('coach_id', auth.user.id)
      .select('*')
      .single();

    if (error || !plan) {
      return NextResponse.json({ error: '找不到可更新的方案' }, { status: 404 });
    }

    return NextResponse.json({ success: true, plan: normalizePlan(plan) });
  } catch (error) {
    console.error('Coach plan update error:', error);
    return NextResponse.json({ error: '方案更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const adminSupabase = getAdminSupabase();

    const { error } = await adminSupabase
      .from('coach_plans')
      .delete()
      .eq('id', id)
      .eq('coach_id', auth.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Coach plan delete error:', error);
    return NextResponse.json({ error: '方案刪除失敗' }, { status: 500 });
  }
}
