export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

function referralBindErrorResponse(error) {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('invalid_referral_code') || message.includes('missing_referral_code')) {
    return NextResponse.json({ error: '請輸入有效的推薦碼' }, { status: 400 });
  }
  if (message.includes('user_not_found')) {
    return NextResponse.json({ error: '找不到使用者資料' }, { status: 404 });
  }
  if (message.includes('already_referred')) {
    return NextResponse.json({ error: '您已經綁定過推薦人，不可重複綁定' }, { status: 400 });
  }
  if (message.includes('self_referral')) {
    return NextResponse.json({ error: '不可綁定自己的推薦碼' }, { status: 400 });
  }
  if (message.includes('referrer_not_found')) {
    return NextResponse.json({ error: '找不到此推薦碼，請確認後再試' }, { status: 404 });
  }

  console.error('Referral bind RPC error:', error);
  return NextResponse.json({ error: '綁定失敗，請稍後再試' }, { status: 500 });
}

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const rawCode = body.code;

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json({ error: '請輸入有效的推薦碼' }, { status: 400 });
    }

    const code = rawCode.trim().toUpperCase();
    if (code.length === 0) {
      return NextResponse.json({ error: '請輸入推薦碼' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const userId = auth.user.id;

    const { error: bindError } = await adminSupabase.rpc('bind_referral_with_window', {
      p_user_id: userId,
      p_code: code,
    });

    if (bindError) {
      return referralBindErrorResponse(bindError);
    }

    return NextResponse.json({ success: true, message: '綁定成功' });
  } catch (err) {
    console.error('Referral bind error:', err);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
