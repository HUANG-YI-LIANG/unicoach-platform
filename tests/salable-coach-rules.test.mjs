import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCoachSaleability,
  getFormalActivePlans,
  getFormalActiveAvailabilityRules,
  isDefaultPlanId,
  pickFormalPlanForBooking,
} from '../lib/salableCoachRules.js';

test('getFormalActivePlans excludes synthetic default and inactive plans', () => {
  const plans = getFormalActivePlans([
    { id: 'default-coach-60', is_active: true, price: 1000, duration_minutes: 60 },
    { id: 'plan-1', is_active: false, price: 1000, duration_minutes: 60 },
    { id: 'plan-2', is_active: true, price: 1200, duration_minutes: 60 },
  ]);

  assert.deepEqual(plans.map((plan) => plan.id), ['plan-2']);
});

test('getFormalActiveAvailabilityRules excludes legacy available_times and inactive rules', () => {
  const rules = getFormalActiveAvailabilityRules([
    { weekday: 1, start_time: '09:00', end_time: '10:00', is_active: false },
    { weekday: 2, start_time: '10:00', end_time: '11:00', is_active: true },
  ], '[{"weekday":1,"start":"09:00","end":"10:00"}]');

  assert.equal(rules.length, 1);
  assert.equal(rules[0].weekday, 2);
});

test('getCoachSaleability requires approved coach, formal plan, and formal schedule', () => {
  assert.deepEqual(getCoachSaleability({
    coach: { approval_status: 'approved' },
    plans: [{ id: 'plan-1', is_active: true, price: 1000, duration_minutes: 60 }],
    availabilityRules: [{ weekday: 1, start_time: '09:00', end_time: '10:00', is_active: true }],
  }), { canSell: true, reasons: [] });

  assert.deepEqual(getCoachSaleability({
    coach: { approval_status: 'pending' },
    plans: [{ id: 'plan-1', is_active: true, price: 1000, duration_minutes: 60 }],
    availabilityRules: [{ weekday: 1, start_time: '09:00', end_time: '10:00', is_active: true }],
  }), { canSell: false, reasons: ['coach_not_approved'] });

  assert.deepEqual(getCoachSaleability({
    coach: { approval_status: 'approved' },
    plans: [],
    availabilityRules: [{ weekday: 1, start_time: '09:00', end_time: '10:00', is_active: true }],
  }), { canSell: false, reasons: ['missing_formal_plan'] });

  assert.deepEqual(getCoachSaleability({
    coach: { approval_status: 'approved' },
    plans: [{ id: 'plan-1', is_active: true, price: 1000, duration_minutes: 60 }],
    availabilityRules: [],
  }), { canSell: false, reasons: ['missing_formal_schedule'] });
});

test('pickFormalPlanForBooking rejects default plan ids and requires an active persisted plan', () => {
  assert.equal(isDefaultPlanId('default-coach-60'), true);
  assert.equal(isDefaultPlanId('plan-1'), false);

  assert.deepEqual(pickFormalPlanForBooking({
    requestedPlanId: 'default-coach-60',
    plans: [{ id: 'plan-1', is_active: true, price: 1000, duration_minutes: 60 }],
  }), { ok: false, status: 400, error: '請選擇教練已正式建立的課程方案' });

  assert.deepEqual(pickFormalPlanForBooking({
    requestedPlanId: 'missing',
    plans: [{ id: 'plan-1', is_active: true, price: 1000, duration_minutes: 60 }],
  }), { ok: false, status: 400, error: '找不到可預約的教練方案' });

  const result = pickFormalPlanForBooking({
    requestedPlanId: 'plan-1',
    plans: [{ id: 'plan-1', is_active: true, price: 1000, duration_minutes: 60 }],
  });

  assert.equal(result.ok, true);
  assert.equal(result.plan.id, 'plan-1');
});
