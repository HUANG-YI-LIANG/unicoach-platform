import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id: coachUserId } = await params;
    const body = await request.json();
    const { commission_rate } = body; // Can be a number or null

    const normalizedRate =
      commission_rate === null || commission_rate === undefined || commission_rate === ''
        ? null
        : Number(commission_rate);

    if (normalizedRate !== null && (!Number.isInteger(normalizedRate) || normalizedRate < 0 || normalizedRate > 100)) {
      return NextResponse.json({ error: '抽成比例必須介於 0 到 100 之間' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { error } = await adminSupabase
      .from('coaches')
      .update({ commission_rate: normalizedRate })
      .eq('user_id', coachUserId);

    if (error) throw error;

    try {
      await adminSupabase.from('audit_logs').insert([{
        action: 'UPDATE_COACH_COMMISSION',
        actor_id: auth.user.id,
        actor_role: 'admin',
        target_id: coachUserId,
        details: JSON.stringify({ new_rate: normalizedRate })
      }]);
    } catch (auditError) {
      console.warn('[UPDATE COMMISSION AUDIT WARNING]', auditError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[UPDATE COMMISSION ERROR]', err);
    return NextResponse.json({ error: '無法更新教練抽成比例' }, { status: 500 });
  }
}
