export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SUPPORT_DEDUCT_POINTS = 200000;

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function normalizeNote(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 300) : null;
}

function mapDeductError(error) {
  const text = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');

  if (/23505|duplicate_deduction_for_message/i.test(text)) {
    return { status: 409, error: '此提領申請已處理扣款，請勿重複扣除。' };
  }
  if (/admin_required|42501/i.test(text)) {
    return { status: 403, error: '僅管理員可操作。' };
  }
  if (/insufficient_balance/i.test(text)) {
    return { status: 400, error: '該用戶餘額不足以進行此扣款。' };
  }
  if (/invalid_deduction_amount|missing_required_user_or_admin|user_not_found|support_message_not_found_for_user/i.test(text)) {
    return { status: 400, error: '扣款資料不合法，請重新確認。' };
  }
  if (/deduct_wallet_points_from_support|Could not find the function|PGRST202/i.test(text)) {
    return { status: 500, error: '請先執行提領扣款 SQL migration 後再扣點。' };
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
      console.warn('[ADMIN SUPPORT DEDUCT JSON WARNING]', safeErrorDetails(parseError));
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
    if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_SUPPORT_DEDUCT_POINTS) {
      return NextResponse.json({ error: '請輸入正確的扣除點數' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase.rpc('deduct_wallet_points_from_support', {
      p_user_id: userId,
      p_admin_id: auth.user.id,
      p_amount: amount,
      p_support_message_id: supportMessageId,
      p_note: note,
    });

    if (error) {
      const mapped = mapDeductError(error);
      if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      throw error;
    }

    return NextResponse.json({
      success: Boolean(data?.success ?? true),
      deductionId: data?.deduction_id || data?.deductionId || null,
      newBalance: data?.new_balance ?? data?.newBalance ?? null,
    });
  } catch (error) {
    console.error('[ADMIN SUPPORT DEDUCT ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '扣除點數失敗' }, { status: 500 });
  }
}
