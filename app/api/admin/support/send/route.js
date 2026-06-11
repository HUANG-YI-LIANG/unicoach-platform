export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 1000;

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.slice(0, MAX_MESSAGE_LENGTH);
}

function supportMessageDto(row) {
  return {
    id: row.id,
    userId: row.user_id,
    message: row.message || null,
    imageUrl: row.image_url || null,
    imagePath: row.image_path || null,
    isFromAdmin: Boolean(row.is_from_admin),
    isSystem: Boolean(row.is_system),
    isReadByAdmin: Boolean(row.is_read_by_admin),
    createdAt: row.created_at,
  };
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.warn('[ADMIN SUPPORT SEND JSON WARNING]', safeErrorDetails(parseError));
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
    }

    const userId = body?.userId;
    const message = normalizeText(body?.message);

    if (!isUuid(userId)) {
      return NextResponse.json({ error: '使用者 ID 格式錯誤' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: '請輸入回覆內容' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase
      .from('support_messages')
      .insert({
        user_id: userId,
        admin_id: auth.user.id,
        message,
        is_from_admin: true,
        is_system: false,
        is_read_by_admin: true,
        is_read_by_user: false,
      })
      .select('id, user_id, message, image_url, image_path, is_from_admin, is_system, is_read_by_admin, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ message: supportMessageDto(data) }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN SUPPORT SEND ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '客服訊息送出失敗' }, { status: 500 });
  }
}
