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
        *,
        users!chat_rooms_user_id_fkey(id, name, grade),
        coaches:users!chat_rooms_coach_id_fkey(id, name, coaches(philosophy))
      `)
      .eq('id', id)
      .single();

    if (error || !room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const isCoach = auth.user.role === 'coach';
    
    return NextResponse.json({
      room: {
        id: room.id,
        coach_name: room.coaches?.name,
        coach_philosophy: room.coaches?.coaches?.[0]?.philosophy,
        user_name: room.users?.name,
        user_grade: room.users?.grade,
        other_name: isCoach ? room.users?.name : room.coaches?.name,
        other_is_coach: !isCoach,
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
