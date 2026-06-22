export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import {
  buildChatRoomInsert,
  buildChatRoomUpsertOptions,
  getChatParticipantsForCreate,
  isDuplicateChatRoomError,
} from '@/lib/chatRules';

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

async function resolveCoachUserId(adminSupabase, rawId) {
  if (!rawId || typeof rawId !== 'string') {
    return { ok: false, status: 400, error: '缺少教練 ID' };
  }

  const candidateId = rawId.trim();
  if (!candidateId) return { ok: false, status: 400, error: '缺少教練 ID' };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidateId)) {
    return { ok: false, status: 400, error: '教練 ID 格式不合法' };
  }

  // P0-4：前台可能傳 coach_profiles.id，也可能傳 users.id。
  // 先以 V2 coach_profiles 解析，避免 /chat?with=[profile_id] 建出不可用聊天室。
  const { data: profile, error: profileError } = await adminSupabase
    .from('coach_profiles')
    .select('id, user_id, verification_status')
    .or(`id.eq.${candidateId},user_id.eq.${candidateId}`)
    .maybeSingle();

  if (profileError && profileError.code !== 'PGRST116' && profileError.code !== '42P01') throw profileError;

  if (profile) {
    if (profile.verification_status !== 'approved') {
      return { ok: false, status: 403, error: '該教練尚未開放聊天' };
    }
    return { ok: true, coachId: profile.user_id, resolvedFrom: profile.id === candidateId ? 'coach_profiles.id' : 'coach_profiles.user_id' };
  }

  // Legacy fallback：舊資料仍可能只有 users/coaches。
  const { data: coachUser, error: userError } = await adminSupabase
    .from('users')
    .select('id, role')
    .eq('id', candidateId)
    .maybeSingle();

  if (userError && userError.code !== 'PGRST116') throw userError;

  const { data: legacyCoach, error: coachError } = await adminSupabase
    .from('coaches')
    .select('user_id, approval_status')
    .eq('user_id', candidateId)
    .maybeSingle();

  if (coachError && coachError.code !== 'PGRST116') throw coachError;
  
  if (legacyCoach || coachUser?.role === 'coach') {
    if (legacyCoach && legacyCoach.approval_status !== 'approved') {
      return { ok: false, status: 403, error: '該教練尚未開放聊天' };
    }
    return { ok: true, coachId: candidateId, resolvedFrom: 'coaches.user_id' };
  }

  return { ok: false, status: 404, error: '找不到該教練' };
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
        coaches:users!chat_rooms_coach_id_fkey(name, avatar_url, coaches(philosophy), coach_profiles(school))
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
          other_party_avatar: auth.user.role === 'coach' ? null : room.coaches?.avatar_url || null,
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
    const adminSupabase = getAdminSupabase();
    const rawCoachId = body.coachId || body.with || body.profileId || body.coachProfileId;

    let normalizedBody = { ...body };
    if (auth.user.role !== 'coach') {
      const resolvedCoach = await resolveCoachUserId(adminSupabase, rawCoachId);
      if (!resolvedCoach.ok) {
        return NextResponse.json({ error: resolvedCoach.error }, { status: resolvedCoach.status });
      }
      normalizedBody.coachId = resolvedCoach.coachId;
    }

    const participants = getChatParticipantsForCreate({ actor: auth.user, body: normalizedBody });
    if (!participants.ok) {
      return NextResponse.json({ error: participants.error }, { status: participants.status });
    }

    const { studentId, coachId: coachIdFinal } = participants;

    if (participants.needsBookingRelationship) {
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

    const chatRoomInsert = buildChatRoomInsert({ studentId, coachId: coachIdFinal });
    const { data: existing, error: existingError } = await adminSupabase
      .from('chat_rooms')
      .select('id')
      .eq('pair_key', chatRoomInsert.pair_key)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ success: true, roomId: existing.id, coachId: coachIdFinal });
    }

    const { data: newRoom, error: upsertError } = await adminSupabase
      .from('chat_rooms')
      .upsert(chatRoomInsert, buildChatRoomUpsertOptions())
      .select('id')
      .single();

    if (upsertError) {
      if (isDuplicateChatRoomError(upsertError)) {
        const { data: fallbackRoom, error: fallbackError } = await adminSupabase
          .from('chat_rooms')
          .select('id')
          .eq('pair_key', chatRoomInsert.pair_key)
          .single();

        if (fallbackError) throw fallbackError;
        return NextResponse.json({ success: true, roomId: fallbackRoom.id, coachId: coachIdFinal });
      }
      throw upsertError;
    }

    return NextResponse.json({ success: true, roomId: newRoom.id, coachId: coachIdFinal });
  } catch (error) {
    console.error('[CHAT ROOMS POST ERROR]', error);
    return NextResponse.json({ error: '建立聊天室失敗' }, { status: 500 });
  }
}
