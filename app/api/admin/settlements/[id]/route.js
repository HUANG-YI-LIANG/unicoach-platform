import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/settlements/[id]
 * 讀取特定結算批次的明細與其包含的訂單
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireAuth(['admin', 'coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const adminSupabase = getAdminSupabase();

    // 1. 讀取批次資訊
    const { data: batch, error: batchErr } = await adminSupabase
      .from('settlement_batches')
      .select(`
        *,
        coach:users!settlement_batches_coach_id_fkey(name, email)
      `)
      .eq('id', id)
      .single();

    if (batchErr || !batch) {
      return NextResponse.json({ error: '找不到該結算批次' }, { status: 404 });
    }

    // 安全檢查：如果是教練，只能看自己的批次
    if (auth.user.role === 'coach' && batch.coach_id !== auth.user.id) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    // 2. 讀取關聯的所有訂單
    const { data: bookings, error: bError } = await adminSupabase
      .from('bookings')
      .select(`
        id,
        final_price,
        coach_payout,
        completed_at,
        expected_time,
        plan_title,
        users!bookings_user_id_fkey(name)
      `)
      .eq('settlement_id', id);

    if (bError) throw bError;

    return NextResponse.json({ 
      batch, 
      bookings: bookings.map(b => ({
        ...b,
        user_name: b.users?.name
      }))
    });

  } catch (err) {
    console.error('Fetch settlement detail error:', err);
    return NextResponse.json({ error: '無法讀取明細' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/settlements/[id]
 * 修改結算批次狀態 (例如：標記為已撥款 paid)
 */
export async function PATCH(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const { status } = await request.json();

    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: '無效的狀態值' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: currentBatch, error: currentError } = await adminSupabase
      .from('settlement_batches')
      .select('id, status')
      .eq('id', id)
      .single();

    if (currentError || !currentBatch) {
      return NextResponse.json({ error: '找不到該結算批次' }, { status: 404 });
    }

    if (currentBatch.status === 'paid' && status !== 'paid') {
      return NextResponse.json({ error: '已撥款批次不可改回其他狀態' }, { status: 400 });
    }

    const updateData = { status };
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }
    if (status === 'cancelled') {
      updateData.paid_at = null;
    }

    const { data, error } = await adminSupabase
      .from('settlement_batches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (status === 'cancelled') {
      await adminSupabase
        .from('bookings')
        .update({ settlement_id: null })
        .eq('settlement_id', id);
    }

    await adminSupabase.from('audit_logs').insert([{
      actor_id: auth.user.id,
      actor_role: auth.user.role,
      action: 'UPDATE_SETTLEMENT_STATUS',
      target_id: id,
      details: JSON.stringify({ from: currentBatch.status, to: status }),
    }]);

    return NextResponse.json({ success: true, batch: data });

  } catch (err) {
    console.error('Update settlement error:', err);
    return NextResponse.json({ error: '更新失敗：' + err.message }, { status: 500 });
  }
}
