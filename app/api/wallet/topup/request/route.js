export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const auth = await requireAuth(['user']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { amount, bankLast5 } = await request.json();
    
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
      return NextResponse.json({ error: '儲值金額無效' }, { status: 400 });
    }

    if (!bankLast5 || String(bankLast5).length < 4) {
      return NextResponse.json({ error: '請提供帳號末五碼' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    
    const { error: insertError } = await adminSupabase
      .from('point_topup_requests')
      .insert([{
        user_id: auth.user.id,
        amount,
        bank_last_5: String(bankLast5),
        status: 'pending'
      }]);

    if (insertError) {
      console.error('Insert topup request error:', insertError);
      return NextResponse.json({ error: '送出失敗，請確認資料庫是否已建立相關資料表' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Topup request error:', error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
