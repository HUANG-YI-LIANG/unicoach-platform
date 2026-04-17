import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    
    // 取得與當前使用者相關的聊天室（包含關聯的使用者與教練名稱）
    const { data: rooms, error } = await adminSupabase
      .from('chat_rooms')
      .select(`
        *, 
        users!chat_rooms_user_id_fkey(name), 
        coaches:users!chat_rooms_coach_id_fkey(name, coaches(philosophy))
      `)
      .or(`user_id.eq.${auth.user.id},coach_id.eq.${auth.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = await Promise.all(rooms.map(async r => {
      // 計算該房中發送給「當前使用者」且「未讀」的訊息數
      const { count: unreadCount } = await adminSupabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', r.id)
        .eq('is_read', false)
        .neq('sender_id', auth.user.id);

      return {
        id: r.id,
        booking_id: r.booking_id,
        other_party_name: auth.user.role === 'coach' ? r.users?.name : r.coaches?.name,
        coach_philosophy: r.coaches?.coaches?.[0]?.philosophy,
        unread_count: unreadCount || 0,
        created_at: r.created_at
      };
    }));

    return NextResponse.json({ rooms: formatted });
  } catch (error) {
    console.error('Chat rooms GET error:', error);
    return NextResponse.json({ error: '無法讀取聊天列表' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['user', 'coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { coachId, userId: targetUserId } = body;
    const adminSupabase = getAdminSupabase();
    const currentUserId = auth.user.id;
    const role = auth.user.role;

    let studentId, coachIdFinal;

    // 📍 邏輯判定：根據角色決定誰是學員、誰是教練
    if (role === 'user') {
      studentId = currentUserId;
      coachIdFinal = coachId;
      if (!coachIdFinal) return NextResponse.json({ error: '缺少教練 ID' }, { status: 400 });
    } else {
      studentId = targetUserId;
      coachIdFinal = currentUserId;
      if (!studentId) return NextResponse.json({ error: '缺少學員 ID' }, { status: 400 });

      // 教練發起聊天的限制：必須有預約紀錄
      const { data: relationship, error: relError } = await adminSupabase
        .from('bookings')
        .select('id')
        .or(`and(user_id.eq.${studentId},coach_id.eq.${coachIdFinal}),and(user_id.eq.${coachIdFinal},coach_id.eq.${studentId})`)
        .limit(1)
        .maybeSingle();
      
      if (relError) throw relError;
      if (!relationship) {
        return NextResponse.json({ error: '您只能對有預約紀錄的學員發起聊天。' }, { status: 403 });
      }
    }

    if (studentId === coachIdFinal) {
      return NextResponse.json({ error: '您不能對自己發起聊天' }, { status: 400 });
    }

    // 📍 1. 檢查是否已有現存聊天室
    const { data: existing, error: existErr } = await adminSupabase
      .from('chat_rooms')
      .select('id')
      .eq('user_id', studentId)
      .eq('coach_id', coachIdFinal)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, roomId: existing.id });
    }

    // 📍 2. 建立新聊天室
    const { data: newRoom, error: insertErr } = await adminSupabase
      .from('chat_rooms')
      .insert([{ user_id: studentId, coach_id: coachIdFinal }])
      .select('id'); // ✅ 修正：移除 .single() 改在下面處理

    if (insertErr) {
      console.error('Insert chat room error:', insertErr);
      return NextResponse.json({ error: '建立聊天室失敗：' + insertErr.message }, { status: 400 });
    }

    if (!newRoom || newRoom.length === 0) {
      return NextResponse.json({ error: '建立聊天室失敗，查無回傳資料' }, { status: 500 });
    }

    return NextResponse.json({ success: true, roomId: newRoom[0].id });
  } catch (err) {
    console.error('Chat rooms POST error:', err);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
