export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    // 1. Get Unread Chat Messages
    // To do this efficiently without joining rooms, we can query chat_messages
    // where is_read is false, sender_id != current_user, and room_id is one of the user's rooms.
    // An easier way is just querying chat_messages where sender != user and is_read == false,
    // and relying on RLS? No, we use adminSupabase, so we must be specific.
    const { data: rooms, error: roomsError } = await adminSupabase
      .from('chat_rooms')
      .select('id')
      .or(`user_id.eq.${auth.user.id},coach_id.eq.${auth.user.id}`);

    if (roomsError) throw roomsError;

    let unreadChatCount = 0;
    if (rooms && rooms.length > 0) {
      const roomIds = rooms.map(r => r.id);
      const { count: chatCount, error: chatError } = await adminSupabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('room_id', roomIds)
        .eq('is_read', false)
        .neq('sender_id', auth.user.id);

      if (chatError) throw chatError;
      unreadChatCount = chatCount || 0;
    }

    // 2. Get Unread Notifications
    const { data: notifications, error: notifError } = await adminSupabase
      .from('user_notifications')
      .select('id, user_id, is_read')
      .or(`user_id.eq.${auth.user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifError && notifError.code !== '42P01') throw notifError;

    let notifCount = 0;
    if (notifications && notifications.length > 0) {
      const { data: reads } = await adminSupabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', auth.user.id);
      
      const readSet = new Set((reads || []).map(r => r.notification_id));
      
      notifCount = notifications.filter(n => {
        if (n.user_id === null) return !readSet.has(n.id);
        return !n.is_read;
      }).length;
    }

    return NextResponse.json({
      success: true,
      unreadChatCount,
      unreadNotificationCount: notifCount || 0,
      totalUnread: unreadChatCount + (notifCount || 0)
    });
  } catch (error) {
    console.error('[UNREAD COUNTS ERROR]', error);
    return NextResponse.json({ error: 'Failed to load unread counts' }, { status: 500 });
  }
}
