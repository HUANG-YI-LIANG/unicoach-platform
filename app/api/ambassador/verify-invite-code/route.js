export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { strictLimiter, getClientIp } from '@/lib/rateLimit';
import { safeErrorDetails } from '@/lib/safeLogging';

function normalizeInviteCode(value) {
  return String(value || '').trim().toUpperCase();
}

function isInviteExpired(expiresAt) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

function invalidInviteResponse(status = 404) {
  return NextResponse.json({ valid: false, error: '無效或不可使用的邀請碼' }, { status });
}

export async function GET(request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await strictLimiter.limit(`ambassador-invite:${ip}`);
    if (!rateLimit.success) {
      return NextResponse.json({ valid: false, error: '請求過於頻繁，請稍後再試。' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const code = normalizeInviteCode(searchParams.get('code'));

    if (!code) {
      return NextResponse.json({ valid: false, error: '缺少邀請碼' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: invite, error } = await adminSupabase
      .from('ambassador_invite_codes')
      .select('id, is_active, max_uses, used_count, expires_at')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('[VERIFY INVITE CODE DB ERROR]', safeErrorDetails(error));
      return NextResponse.json({ valid: false, error: '無法驗證邀請碼' }, { status: 500 });
    }

    if (!invite) return invalidInviteResponse(404);
    if (!invite.is_active) return invalidInviteResponse(403);
    if (Number(invite.used_count || 0) >= Number(invite.max_uses || 0)) return invalidInviteResponse(403);
    if (isInviteExpired(invite.expires_at)) return invalidInviteResponse(403);

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('[VERIFY INVITE CODE FATAL ERROR]', safeErrorDetails(error));
    return NextResponse.json({ valid: false, error: '系統錯誤' }, { status: 500 });
  }
}
