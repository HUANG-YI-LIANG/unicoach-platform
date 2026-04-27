import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

async function verifyRoomParticipant(adminSupabase, roomId, userId) {
  const { data, error } = await adminSupabase
    .from("chat_rooms")
    .select("id, user_id, coach_id")
    .eq("id", roomId)
    .single();

  if (error || !data) {
    return { isValid: false, reason: "找不到聊天室" };
  }

  const isParticipant = data.user_id === userId || data.coach_id === userId;
  if (!isParticipant) {
    return { isValid: false, reason: "你沒有權限存取這個聊天室" };
  }

  return { isValid: true, room: data };
}

function sanitizeMessage(rawMessage) {
  const trimmed = rawMessage?.trim();
  if (!trimmed) return null;

  const restrictedPattern = /line|ig|instagram|電話|手機|聯絡方式|私下交易/i;
  if (restrictedPattern.test(trimmed)) {
    return "[系統提醒] 為保護雙方權益，請避免在聊天室中交換私人聯絡方式。";
  }

  return trimmed;
}

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { roomId, message, isSystem } = await request.json();
    if (!roomId || !message?.trim()) {
      return NextResponse.json({ error: "缺少聊天室或訊息內容" }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { isValid, reason } = await verifyRoomParticipant(adminSupabase, roomId, auth.user.id);
    if (!isValid) {
      console.warn(`[CHAT SECURITY] invalid post access user=${auth.user.id} room=${roomId}`);
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const finalMessage = sanitizeMessage(message);
    if (!finalMessage) {
      return NextResponse.json({ error: "訊息內容不可空白" }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from("chat_messages")
      .insert([{
        room_id: roomId,
        sender_id: auth.user.id,
        message: finalMessage,
        is_system: Boolean(isSystem),
        is_read: false,
      }])
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, messageId: data.id });
  } catch (error) {
    console.error("[CHAT POST ERROR]", error);
    return NextResponse.json({ error: "送出訊息失敗" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    if (!roomId) {
      return NextResponse.json({ error: "缺少 roomId" }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { isValid, reason } = await verifyRoomParticipant(adminSupabase, roomId, auth.user.id);
    if (!isValid) {
      console.warn(`[CHAT SECURITY] invalid get access user=${auth.user.id} room=${roomId}`);
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { data: messages, error } = await adminSupabase
      .from("chat_messages")
      .select("*, users!chat_messages_sender_id_fkey(name, role)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    const formattedMessages = (messages || []).map((message) => ({
      ...message,
      sender_name: message.users?.name,
      sender_role: message.users?.role,
    }));

    const unreadMessageIds = formattedMessages
      .filter((message) => !message.is_system && !message.is_read && String(message.sender_id) !== String(auth.user.id))
      .map((message) => message.id);

    if (unreadMessageIds.length > 0) {
      const { error: markReadError } = await adminSupabase
        .from("chat_messages")
        .update({ is_read: true })
        .in("id", unreadMessageIds);

      if (markReadError) {
        console.warn("[CHAT MARK READ WARNING]", markReadError);
      }
    }

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error("[CHAT GET ERROR]", error);
    return NextResponse.json({ error: "載入訊息失敗" }, { status: 500 });
  }
}
