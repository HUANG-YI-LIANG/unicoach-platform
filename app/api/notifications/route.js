export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

const ALLOWED_TYPES = new Set([
  'lesson_log_created',
  'booking_confirmed',
  'booking_reminder',
  'booking_changed',
  'rebook_suggestion',
]);

function notificationDto(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    linkUrl: row.link_url,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === '1' || searchParams.get('unreadOnly') === 'true';
    const requestedType = searchParams.get('type');
    const limitRaw = Number(searchParams.get('limit') || 30);
    const limit = Number.isInteger(limitRaw) ? Math.max(1, Math.min(limitRaw, 50)) : 30;

    if (requestedType && !ALLOWED_TYPES.has(requestedType)) {
      return NextResponse.json({ error: '通知類型不合法' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    let query = adminSupabase
      .from('notifications')
      .select('id, user_id, type, title, message, link_url, is_read, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('is_read', false);
    if (requestedType) query = query.eq('type', requestedType);

    const [{ data: notifications, error }, { count: unreadCount, error: countError }] = await Promise.all([
      query,
      adminSupabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', auth.user.id)
        .eq('is_read', false),
    ]);

    if (error) throw error;
    if (countError) throw countError;

    return NextResponse.json({
      notifications: (notifications || []).map(notificationDto),
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('[NOTIFICATIONS LIST ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '無法取得通知' }, { status: 500 });
  }
}
