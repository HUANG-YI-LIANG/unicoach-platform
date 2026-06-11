export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SUPPORT_GRANT_POINTS = 200000;

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function normalizeNote(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 300) : null;
}

function mapGrantError(error) {
  const text = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');

  if (/23505|support_wallet_grants|duplicate|unique|already|重複|已處理/i.test(text)) {
    return { status: 409, error: '此截圖或客服申請已處理，請勿重複加值。' };
  }
  if (/admin_required|42501/i.test(text)) {
    return { status: 403, error: '僅管理員可操作。' };
  }
  if (/invalid_grant_amount|missing_required_user_or_admin|user_not_found|support_message_not_found_for_user/i.test(text)) {
    return { status: 400, error: '發放點數資料不合法，請重新確認。' };
  }
  if (/grant_wallet_points_from_support|Could not find the function|PGRST202/i.test(text)) {
    return { status: 500, error: '請先執行客服儲值 V2 SQL migration 後再發放點數。' };
  }
  return null;
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.warn('[ADMIN SUPPORT GRANT JSON WARNING]', safeErrorDetails(parseError));
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
    }

    const userId = body?.userId;
    const supportMessageId = body?.supportMessageId || null;
    const amount = Number(body?.amount);
    const note = normalizeNote(body?.note);

    if (!isUuid(userId)) {
      return NextResponse.json({ error: '使用者 ID 格式錯誤' }, { status: 400 });
    }
    if (supportMessageId && !isUuid(supportMessageId)) {
      return NextResponse.json({ error: '客服訊息 ID 格式錯誤' }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_SUPPORT_GRANT_POINTS) {
      return NextResponse.json({ error: '請輸入正確的發放點數' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase.rpc('grant_wallet_points_from_support', {
      p_user_id: userId,
      p_admin_id: auth.user.id,
      p_amount: amount,
      p_support_message_id: supportMessageId,
      p_note: note,
    });

    if (error) {
      const mapped = mapGrantError(error);
      if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      throw error;
    }

    return NextResponse.json({
      success: Boolean(data?.success ?? true),
      grantId: data?.grantId || data?.grant_id || null,
      newBalance: data?.newBalance ?? data?.new_balance ?? null,
    });
  } catch (error) {
    console.error('[ADMIN SUPPORT GRANT ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '發放點數失敗' }, { status: 500 });
  }
}
