export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function messageDto(row) {
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

function buildConversationSummaries(rows) {
  const byUser = new Map();
  for (const row of rows || []) {
    const existing = byUser.get(row.user_id);
    if (!existing) {
      byUser.set(row.user_id, {
        userId: row.user_id,
        userName: row.users?.name || '使用者',
        userEmail: row.users?.email || null,
        role: row.users?.role || 'user',
        walletBalance: row.users?.wallet_balance || 0,
        latestMessage: row.message || (row.image_path || row.image_url ? '圖片訊息' : '系統訊息'),
        latestAt: row.created_at,
        unreadCount: row.is_from_admin || row.is_read_by_admin ? 0 : 1,
      });
      continue;
    }

    if (!row.is_from_admin && !row.is_read_by_admin) existing.unreadCount += 1;
  }
  return Array.from(byUser.values());
}

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (userId && !isUuid(userId)) {
      return NextResponse.json({ error: '使用者 ID 格式錯誤' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    if (userId) {
      const { data: messages, error } = await adminSupabase
        .from('support_messages')
        .select('id, user_id, message, image_url, image_path, is_from_admin, is_system, is_read_by_admin, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(300);

      if (error) throw error;

      await adminSupabase
        .from('support_messages')
        .update({ is_read_by_admin: true })
        .eq('user_id', userId)
        .eq('is_from_admin', false)
        .eq('is_read_by_admin', false);

      return NextResponse.json({ messages: (messages || []).map(messageDto) });
    }

    const { data: rows, error } = await adminSupabase
      .from('support_messages')
      .select('id, user_id, message, image_url, image_path, is_from_admin, is_read_by_admin, created_at, users!support_messages_user_id_fkey(name, email, role, wallet_balance)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    return NextResponse.json({ conversations: buildConversationSummaries(rows) });
  } catch (error) {
    console.error('[ADMIN SUPPORT CONVERSATIONS ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '客服對話讀取失敗' }, { status: 500 });
  }
}
