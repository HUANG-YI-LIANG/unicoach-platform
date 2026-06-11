export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

const MAX_MESSAGE_LENGTH = 1000;

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.slice(0, MAX_MESSAGE_LENGTH);
}

function normalizeSupportImagePath(value, userId) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const prefix = `${userId}/`;
  if (!text.startsWith(prefix) || text.includes('..') || text.length > 512) return null;
  return text;
}

function normalizeSupportImageUrl(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') return null;
    return url.toString().slice(0, 1024);
  } catch (_) {
    return null;
  }
}

function supportMessageDto(row) {
  return {
    id: row.id,
    message: row.message || null,
    imageUrl: row.image_url || null,
    imagePath: row.image_path || null,
    isFromAdmin: Boolean(row.is_from_admin),
    isSystem: Boolean(row.is_system),
    createdAt: row.created_at,
  };
}

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.warn('[SUPPORT SEND JSON WARNING]', safeErrorDetails(parseError));
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
    }

    const message = normalizeText(body?.message);
    const imagePath = normalizeSupportImagePath(body?.imagePath ?? body?.image_path, auth.user.id);
    const imageUrl = normalizeSupportImageUrl(body?.imageUrl ?? body?.image_url);

    if (!message && !imagePath && !imageUrl) {
      return NextResponse.json({ error: '請輸入訊息或上傳圖片' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase
      .from('support_messages')
      .insert({
        user_id: auth.user.id,
        message,
        image_url: imageUrl,
        image_path: imagePath,
        is_from_admin: false,
        is_system: false,
        is_read_by_admin: false,
        is_read_by_user: true,
      })
      .select('id, message, image_url, image_path, is_from_admin, is_system, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ message: supportMessageDto(data) }, { status: 201 });
  } catch (error) {
    console.error('[SUPPORT SEND ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '客服訊息送出失敗' }, { status: 500 });
  }
}
