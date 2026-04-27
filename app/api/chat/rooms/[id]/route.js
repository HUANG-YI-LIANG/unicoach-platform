import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const adminSupabase = getAdminSupabase();

    const { data: room, error } = await adminSupabase
      .from('chat_rooms')
      .select(`
        id,
        user_id,
        coach_id,
        users!chat_rooms_user_id_fkey(id, name, grade),
        coaches:users!chat_rooms_coach_id_fkey(id, name, coaches(philosophy))
      `)
      .eq('id', id)
      .single();

    if (error || !room) {
      return NextResponse.json({ error: '找不到聊天室' }, { status: 404 });
    }

    const isParticipant = room.user_id === auth.user.id || room.coach_id === auth.user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: '你沒有權限查看這個聊天室' }, { status: 403 });
    }

    const isCoach = auth.user.role === 'coach';

    return NextResponse.json({
      room: {
        id: room.id,
        coach_name: room.coaches?.name || null,
        coach_philosophy: room.coaches?.coaches?.[0]?.philosophy || null,
        user_name: room.users?.name || null,
        user_grade: room.users?.grade || null,
        other_name: isCoach ? room.users?.name : room.coaches?.name,
        other_is_coach: !isCoach,
      },
    });
  } catch (error) {
    console.error('[CHAT ROOM DETAIL ERROR]', error);
    return NextResponse.json({ error: '載入聊天室資料失敗' }, { status: 500 });
  }
}
