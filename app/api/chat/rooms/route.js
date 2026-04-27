import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

async function getRoomStats(adminSupabase, roomId, viewerId) {
  const [{ data: latestMessage }, unreadResult] = await Promise.all([
    adminSupabase
      .from('chat_messages')
      .select('message, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminSupabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('is_read', false)
      .neq('sender_id', viewerId),
  ]);

  const unreadCount = unreadResult.error ? 0 : unreadResult.count || 0;

  return {
    lastMessage: latestMessage?.message || null,
    updatedAt: latestMessage?.created_at || null,
    unreadCount,
  };
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: rooms, error } = await adminSupabase
      .from('chat_rooms')
      .select(`
        id,
        booking_id,
        user_id,
        coach_id,
        created_at,
        users!chat_rooms_user_id_fkey(name),
        coaches:users!chat_rooms_coach_id_fkey(name, coaches(philosophy))
      `)
      .or(`user_id.eq.${auth.user.id},coach_id.eq.${auth.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = await Promise.all(
      (rooms || []).map(async (room) => {
        const stats = await getRoomStats(adminSupabase, room.id, auth.user.id);

        return {
          id: room.id,
          booking_id: room.booking_id,
          other_party_name: auth.user.role === 'coach' ? room.users?.name : room.coaches?.name,
          coach_philosophy: room.coaches?.coaches?.[0]?.philosophy || null,
          last_message: stats.lastMessage,
          unread_count: stats.unreadCount,
          created_at: room.created_at,
          updated_at: stats.updatedAt || room.created_at,
        };
      })
    );

    formatted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return NextResponse.json({ rooms: formatted });
  } catch (error) {
    console.error('[CHAT ROOMS GET ERROR]', error);
    return NextResponse.json({ error: '載入聊天室列表失敗' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['user', 'coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { coachId, userId: targetUserId } = body;
    const adminSupabase = getAdminSupabase();
    const currentUserId = auth.user.id;
    const role = auth.user.role;

    let studentId;
    let coachIdFinal;

    if (role === 'user' || role === 'admin') {
      studentId = currentUserId;
      coachIdFinal = coachId;
      if (!coachIdFinal) {
        return NextResponse.json({ error: '缺少教練 ID' }, { status: 400 });
      }
    } else {
      studentId = targetUserId;
      coachIdFinal = currentUserId;
      if (!studentId) {
        return NextResponse.json({ error: '缺少學員 ID' }, { status: 400 });
      }

      const { data: relationship, error: relError } = await adminSupabase
        .from('bookings')
        .select('id')
        .eq('user_id', studentId)
        .eq('coach_id', coachIdFinal)
        .limit(1)
        .maybeSingle();

      if (relError) throw relError;
      if (!relationship) {
        return NextResponse.json({ error: '教練只能與已有預約關係的學員開啟聊天室' }, { status: 403 });
      }
    }

    if (studentId === coachIdFinal) {
      return NextResponse.json({ error: '不能和自己建立聊天室' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await adminSupabase
      .from('chat_rooms')
      .select('id')
      .eq('user_id', studentId)
      .eq('coach_id', coachIdFinal)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ success: true, roomId: existing.id });
    }

    const { data: newRoom, error: insertError } = await adminSupabase
      .from('chat_rooms')
      .insert([{ user_id: studentId, coach_id: coachIdFinal }])
      .select('id')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, roomId: newRoom.id });
  } catch (error) {
    console.error('[CHAT ROOMS POST ERROR]', error);
    return NextResponse.json({ error: '建立聊天室失敗' }, { status: 500 });
  }
}
