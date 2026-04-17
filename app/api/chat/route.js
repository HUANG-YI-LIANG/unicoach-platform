import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ============================================================
// 驗證用戶是否為聊天室合法參與者
// ============================================================
async function verifyRoomParticipant(adminSupabase, roomId, userId) {
  const { data, error } = await adminSupabase
    .from("chat_rooms")
    .select("id, user_id, coach_id")
    .eq("id", roomId)
    .single();

  if (error || !data) {
    return { isValid: false, reason: "聊天室不存在或無法讀取。" };
  }

  const isParticipant = data.user_id === userId || data.coach_id === userId;
  if (!isParticipant) {
    return { isValid: false, reason: "您無權存取此聊天室。" };
  }

  return { isValid: true, room: data };
}

// ============================================================
// POST：發送訊息
// ============================================================
export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { roomId, message, isSystem } = await request.json();
    if (!roomId || !message?.trim()) {
      return NextResponse.json({ error: "內容必填。" }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    
    // ✅ 核心防護：驗證參與者身份
    const { isValid, reason } = await verifyRoomParticipant(adminSupabase, roomId, auth.user.id);
    if (!isValid) {
      console.warn(`[SECURITY ALERT] 越權發布訊息嘗試: UserID: ${auth.user.id}, RoomID: ${roomId}`);
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // 違規關鍵字過濾
    const isViolating = /LINE|IG|電話|私下匯款|現金交易/.test(message);
    const finalMessage = isViolating ? "[系統偵測到可能違規的交易字眼，該訊息已被隱藏]" : message.trim();

    const { data, error } = await adminSupabase.from('chat_messages').insert([{
      room_id: roomId,
      sender_id: auth.user.id,
      message: finalMessage,
      is_system: isSystem ? true : false
    }]).select('id').single();

    if (error) throw error;
    return NextResponse.json({ success: true, messageId: data.id });
  } catch (error) {
    console.error("[CHAT POST ERROR]", error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}

// ============================================================
// GET：讀取聊天記錄
// ============================================================
export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });

    const adminSupabase = getAdminSupabase();

    // ✅ 核心防護：驗證參與者身份
    const { isValid, reason } = await verifyRoomParticipant(adminSupabase, roomId, auth.user.id);
    if (!isValid) {
      console.warn(`[SECURITY ALERT] 越權讀取訊息嘗試: UserID: ${auth.user.id}, RoomID: ${roomId}`);
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { data: messages, error } = await adminSupabase
      .from('chat_messages')
      .select('*, users!chat_messages_sender_id_fkey(name, role)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    const formatted = messages.map(m => ({
      ...m,
      sender_name: m.users?.name,
      sender_role: m.users?.role
    }));

    return NextResponse.json({ messages: formatted });
  } catch (error) {
    console.error("[CHAT GET ERROR]", error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
