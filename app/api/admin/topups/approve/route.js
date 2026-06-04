export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { requestId, userId, amount } = await request.json();
    const adminSupabase = getAdminSupabase();
    
    // 1. Verify the request is still pending
    const { data: reqData, error: reqError } = await adminSupabase
      .from('point_topup_requests')
      .select('status, amount')
      .eq('id', requestId)
      .single();

    if (reqError || !reqData || reqData.status !== 'pending') {
      return NextResponse.json({ error: '該申請不存在或已被處理' }, { status: 400 });
    }

    // 2. Fetch current user balance
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: '找不到申請的用戶' }, { status: 404 });
    }

    const newBalance = (user.wallet_balance || 0) + reqData.amount;

    // 3. Update request status
    const { error: updateReqError } = await adminSupabase
      .from('point_topup_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: auth.user.id
      })
      .eq('id', requestId);

    if (updateReqError) throw updateReqError;

    // 4. Update user balance
    const { error: updateUserError } = await adminSupabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (updateUserError) {
      // Rollback status theoretically, but we don't have transaction here
      console.error('Failed to update user balance after approving request', updateUserError);
    }

    // 5. Audit log
    await adminSupabase.from('audit_logs').insert([{
      action: 'APPROVE_TOPUP',
      actor_id: auth.user.id,
      actor_role: 'admin',
      target_id: requestId,
      details: JSON.stringify({ userId, amount: reqData.amount, newBalance })
    }]);

    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    console.error('Approve topup error:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
