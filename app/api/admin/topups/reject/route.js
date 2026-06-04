export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { requestId } = await request.json();
    const adminSupabase = getAdminSupabase();
    
    // 1. Update request status
    const { error: updateReqError } = await adminSupabase
      .from('point_topup_requests')
      .update({
        status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: auth.user.id
      })
      .eq('id', requestId);

    if (updateReqError) throw updateReqError;

    // 2. Audit log
    await adminSupabase.from('audit_logs').insert([{
      action: 'REJECT_TOPUP',
      actor_id: auth.user.id,
      actor_role: 'admin',
      target_id: requestId
    }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reject topup error:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
