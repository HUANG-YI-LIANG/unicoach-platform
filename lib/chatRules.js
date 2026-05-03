export function getChatParticipantsForCreate({ actor, body = {} }) {
  if (!actor) return { ok: false, status: 401, error: '請先登入' };

  const role = actor.role;
  const currentUserId = actor.id;
  let studentId;
  let coachId;
  let needsBookingRelationship = false;

  if (role === 'coach') {
    studentId = body.userId;
    coachId = currentUserId;
    needsBookingRelationship = true;
    if (!studentId) {
      return { ok: false, status: 400, error: '缺少學員 ID' };
    }
  } else {
    studentId = role === 'admin' && body.userId ? body.userId : currentUserId;
    coachId = body.coachId;
    if (!coachId) {
      return { ok: false, status: 400, error: '缺少教練 ID' };
    }
  }

  if (studentId === coachId) {
    return { ok: false, status: 400, error: '不能和自己建立聊天室' };
  }

  return { ok: true, studentId, coachId, needsBookingRelationship };
}

export function buildChatRoomPairKey({ studentId, coachId }) {
  return `${studentId}:${coachId}`;
}

export function buildChatRoomInsert({ studentId, coachId }) {
  return {
    user_id: studentId,
    coach_id: coachId,
    pair_key: buildChatRoomPairKey({ studentId, coachId }),
  };
}

export function buildChatRoomUpsertOptions() {
  return {
    onConflict: 'pair_key',
    ignoreDuplicates: false,
  };
}

export function isDuplicateChatRoomError(error) {
  const text = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');

  return error?.code === '23505' || /duplicate key|unique constraint|chat_rooms_pair_key/i.test(text);
}
