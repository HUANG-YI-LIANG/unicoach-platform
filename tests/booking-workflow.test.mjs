import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildConfirmPaymentUpdate,
  buildExpiredPendingPaymentUpdate,
  canTransitionBookingStatus,
  getPendingPaymentExpirationState,
  canSubmitLearningReport,
  canGenerateAiReportDraft,
  canUpsertAiDraft,
} from '../lib/bookingWorkflow.js';

test('buildConfirmPaymentUpdate synchronizes booking payment fields', () => {
  const update = buildConfirmPaymentUpdate(new Date('2026-05-02T10:00:00.000Z'));
  assert.deepEqual(update, {
    status: 'scheduled',
    payment_status: 'paid',
    paid_at: '2026-05-02T10:00:00.000Z',
    payment_expires_at: null,
  });
});

test('expired pending_payment booking is detected before payment operations continue', () => {
  const result = getPendingPaymentExpirationState({
    status: 'pending_payment',
    payment_expires_at: '2026-05-02T09:59:59.000Z',
  }, new Date('2026-05-02T10:00:00.000Z'));

  assert.deepEqual(result, {
    expired: true,
    status: 409,
    error: '付款保留時間已過期，請重新建立預約',
  });
});

test('non-expired or non-pending bookings are not treated as payment expired', () => {
  assert.equal(getPendingPaymentExpirationState({
    status: 'pending_payment',
    payment_expires_at: '2026-05-02T10:00:01.000Z',
  }, new Date('2026-05-02T10:00:00.000Z')).expired, false);

  assert.equal(getPendingPaymentExpirationState({
    status: 'scheduled',
    payment_expires_at: '2026-05-02T09:59:59.000Z',
  }, new Date('2026-05-02T10:00:00.000Z')).expired, false);
});

test('buildExpiredPendingPaymentUpdate marks unpaid expired booking cancelled without paid fields', () => {
  assert.deepEqual(buildExpiredPendingPaymentUpdate(), {
    status: 'cancelled',
    payment_status: 'expired',
    payment_expires_at: null,
  });
});

test('coach cannot directly complete scheduled booking', () => {
  const result = canTransitionBookingStatus({
    actor: { id: 'coach-1', role: 'coach' },
    booking: { user_id: 'user-1', coach_id: 'coach-1', status: 'scheduled', payment_status: 'paid' },
    newStatus: 'completed',
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test('coach moves in_progress booking only to pending_completion before student completion', () => {
  const result = canTransitionBookingStatus({
    actor: { id: 'coach-1', role: 'coach' },
    booking: { user_id: 'user-1', coach_id: 'coach-1', status: 'in_progress', payment_status: 'paid' },
    newStatus: 'pending_completion',
  });

  assert.equal(result.ok, true);
});

test('student can complete only from pending_completion and only when report exists', () => {
  assert.equal(canTransitionBookingStatus({
    actor: { id: 'user-1', role: 'user' },
    booking: { user_id: 'user-1', coach_id: 'coach-1', status: 'pending_completion', payment_status: 'paid' },
    newStatus: 'completed',
    hasFinalReport: false,
  }).ok, false);

  assert.equal(canTransitionBookingStatus({
    actor: { id: 'user-1', role: 'user' },
    booking: { user_id: 'user-1', coach_id: 'coach-1', status: 'pending_completion', payment_status: 'paid' },
    newStatus: 'completed',
    hasFinalReport: true,
  }).ok, true);
});

test('learning reports are accepted only after class has started and before completion', () => {
  assert.equal(canSubmitLearningReport({ status: 'scheduled', coach_id: 'coach-1' }, { id: 'coach-1', role: 'coach' }).ok, false);
  assert.equal(canSubmitLearningReport({ status: 'in_progress', coach_id: 'coach-1' }, { id: 'coach-1', role: 'coach' }).ok, true);
  assert.equal(canSubmitLearningReport({ status: 'pending_completion', coach_id: 'coach-1' }, { id: 'coach-1', role: 'coach' }).ok, true);
});

test('AI draft cannot overwrite an existing final report', () => {
  assert.equal(canUpsertAiDraft({ completed_items: 'warmup, drills' }).ok, false);
  assert.equal(canUpsertAiDraft({ completed_items: '__AI_DRAFT__' }).ok, true);
  assert.equal(canUpsertAiDraft(null).ok, true);
});

test('AI draft generation follows the same report timing and coach ownership rules', () => {
  assert.equal(canGenerateAiReportDraft({ status: 'scheduled', coach_id: 'coach-1' }, { id: 'coach-1', role: 'coach' }).ok, false);
  assert.equal(canGenerateAiReportDraft({ status: 'in_progress', coach_id: 'coach-1' }, { id: 'coach-2', role: 'coach' }).ok, false);
  assert.equal(canGenerateAiReportDraft({ status: 'in_progress', coach_id: 'coach-1' }, { id: 'coach-1', role: 'coach' }).ok, true);
});
