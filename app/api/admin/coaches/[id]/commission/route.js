import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id: coachUserId } = await params;
    const body = await request.json();
    const { commission_discount } = body; // Can be a number or null

    // Normalize value
    const normalizedDiscount = 
      commission_discount === null || commission_discount === undefined || commission_discount === ''
        ? null
        : Number(commission_discount);

    // Validate if it's a valid number between 0-100 when provided
    if (normalizedDiscount !== null && (isNaN(normalizedDiscount) || normalizedDiscount < 0 || normalizedDiscount > 100)) {
      return NextResponse.json({ error: '減免比例必須是 0-100 之間的數字' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { error } = await adminSupabase
      .from('coaches')
      .update({ commission_discount: normalizedDiscount })
      .eq('user_id', coachUserId);

    if (error) throw error;

    try {
      await adminSupabase.from('audit_logs').insert([{
        action: 'UPDATE_COACH_COMMISSION',
        actor_id: auth.user.id,
        actor_role: 'admin',
        target_id: coachUserId,
        details: JSON.stringify({ commission_discount: normalizedDiscount })
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
