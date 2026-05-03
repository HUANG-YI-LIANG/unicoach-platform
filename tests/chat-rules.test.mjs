import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildChatRoomInsert,
  buildChatRoomUpsertOptions,
  getChatParticipantsForCreate,
  isDuplicateChatRoomError,
} from '../lib/chatRules.js';

test('getChatParticipantsForCreate normalizes user initiated chat room participants', () => {
  const result = getChatParticipantsForCreate({
    actor: { id: 'user-1', role: 'user' },
    body: { coachId: 'coach-1' },
  });

  assert.deepEqual(result, {
    ok: true,
    studentId: 'user-1',
    coachId: 'coach-1',
    needsBookingRelationship: false,
  });
});

test('getChatParticipantsForCreate requires coaches to target an existing student relationship', () => {
  const result = getChatParticipantsForCreate({
    actor: { id: 'coach-1', role: 'coach' },
    body: { userId: 'user-1' },
  });

  assert.deepEqual(result, {
    ok: true,
    studentId: 'user-1',
    coachId: 'coach-1',
    needsBookingRelationship: true,
  });
});

test('getChatParticipantsForCreate rejects self chat rooms and missing target ids', () => {
  assert.equal(getChatParticipantsForCreate({
    actor: { id: 'user-1', role: 'user' },
    body: {},
  }).ok, false);

  const selfResult = getChatParticipantsForCreate({
    actor: { id: 'user-1', role: 'user' },
    body: { coachId: 'user-1' },
  });
  assert.equal(selfResult.ok, false);
  assert.equal(selfResult.status, 400);
});

test('chat room insert uses deterministic pair key and database upsert conflict target', () => {
  assert.deepEqual(buildChatRoomInsert({ studentId: 'user-1', coachId: 'coach-1' }), {
    user_id: 'user-1',
    coach_id: 'coach-1',
    pair_key: 'user-1:coach-1',
  });

  assert.deepEqual(buildChatRoomUpsertOptions(), {
    onConflict: 'pair_key',
    ignoreDuplicates: false,
  });
});

test('duplicate chat room database errors are recognized for safe fallback fetch', () => {
  assert.equal(isDuplicateChatRoomError({ code: '23505' }), true);
  assert.equal(isDuplicateChatRoomError({ message: 'duplicate key value violates unique constraint "chat_rooms_pair_key_unique"' }), true);
  assert.equal(isDuplicateChatRoomError({ code: 'PGRST116' }), false);
});
