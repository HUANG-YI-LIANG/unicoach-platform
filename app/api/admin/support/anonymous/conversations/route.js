export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

export async function GET(request) {
  try {
    const adminSupabase = getAdminSupabase();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // 取得單一對話的所有訊息
      const { data: messages, error } = await adminSupabase
        .from('anonymous_support_messages')
        .select('id, sender, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ messages }, { status: 200 });
    }

    // 取得所有匿名 Session，包含最後一則訊息
    const { data: sessions, error } = await adminSupabase
      .from('anonymous_support_sessions')
      .select(`
        id, pin_code, status, created_at,
        messages:anonymous_support_messages (
          content, created_at, sender
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 格式化資料以配合前端 RoomCard
    const formattedSessions = sessions.map(session => {
      // 找出最新的一則訊息
      const sortedMessages = session.messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const lastMessage = sortedMessages[0];
      const unreadCount = sortedMessages.filter(m => m.sender === 'user').length;

      return {
        id: session.id,
        sessionId: session.id, // 用於識別匿名對話
        userId: session.id, // 為了相容前端 setSelectedConvo 邏輯
        userName: `訪客 (PIN: ${session.pin_code})`,
        role: 'anonymous', // 自訂角色
        walletBalance: '不適用',
        latestMessage: lastMessage ? lastMessage.content : '尚未留言',
        latestMessageAt: lastMessage ? lastMessage.created_at : session.created_at,
        unreadCount: session.status === 'open' && lastMessage?.sender === 'user' ? 1 : 0
      };
    });

    return NextResponse.json({ conversations: formattedSessions }, { status: 200 });
  } catch (error) {
    console.error('[ADMIN ANONYMOUS SESSIONS GET ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '無法讀取訪客訊息列表' }, { status: 500 });
  }
}
