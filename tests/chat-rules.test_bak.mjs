import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildChatRoomInsert,
  buildChatRoomUpsertOptions,
  getChatParticipantsForCreate,
  isDuplicateChatRoomError,
} from '../lib/chatRules.js';

const root = process.cwd();
const bookingsRoute = readFileSync(join(root, 'app/api/bookings/route.js'), 'utf8');

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

test('booking auto chat uses deterministic pair_key upsert and duplicate fallback', () => {
  assert.match(bookingsRoute, /buildChatRoomInsert/, 'booking route should use shared chat room insert builder with pair_key');
  assert.match(bookingsRoute, /buildChatRoomUpsertOptions/, 'booking route should use pair_key upsert options');
  assert.match(bookingsRoute, /isDuplicateChatRoomError/, 'booking route should handle duplicate pair_key races');
  assert.match(bookingsRoute, /\.eq\(\s*['"]pair_key['"]\s*,\s*chatRoomInsert\.pair_key\s*\)/, 'booking route should find existing rooms by pair_key');
  assert.doesNotMatch(bookingsRoute, /\.insert\(\s*\[\s*\{[\s\S]{0,220}from\('chat_rooms'\)[\s\S]{0,220}\}\s*\]\s*\)/, 'booking auto chat should not use plain insert without pair_key conflict handling');
});
