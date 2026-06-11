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
    if (!requestId) {
      return NextResponse.json({ error: '缺少儲值申請 ID' }, { status: 400 });
    }
    const adminSupabase = getAdminSupabase();

    const { data, error } = await adminSupabase.rpc('reject_point_topup_request', {
      p_request_id: requestId,
      p_admin_id: auth.user.id,
    });

    if (error) {
      const text = [error.code, error.message, error.details, error.hint].filter(Boolean).join(' ');
      if (/reject_point_topup_request|Could not find the function|PGRST202/i.test(text)) {
        return NextResponse.json({ error: '請先執行錢包補強 SQL migration 後再拒絕儲值' }, { status: 500 });
      }
      if (/topup_request_not_found|topup_request_already_processed/i.test(text)) {
        return NextResponse.json({ error: '該申請不存在或已被處理' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json(data || { success: true });
  } catch (error) {
    console.error('Reject topup error:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
