import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertFutureBookingTime,
  getServerCouponDiscount,
  canAdjustBookingPrice,
  calculateBookingPrice,
  isBookingTimeAllowed,
} from '../lib/bookingSecurity.js';

test('assertFutureBookingTime rejects past booking times', () => {
  const result = assertFutureBookingTime('2026-05-01T09:00:00+08:00', new Date('2026-05-02T00:00:00+08:00'));
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test('getServerCouponDiscount ignores forged client discounts and only trusts owned coupon id', () => {
  const discount = getServerCouponDiscount({
    requestedCouponId: 'coupon-10',
    claimedCoupons: [
      { id: 'coupon-10', discount: 10, expires: '2099-12-31' },
      { id: 'coupon-20', discount: 20, expires: '2000-01-01' },
    ],
    now: new Date('2026-05-02T00:00:00+08:00'),
  });

  assert.equal(discount.couponId, 'coupon-10');
  assert.equal(discount.percent, 10);
});

test('getServerCouponDiscount rejects unknown or unowned coupon ids', () => {
  assert.throws(() => getServerCouponDiscount({
    requestedCouponId: 'not-owned',
    claimedCoupons: [{ id: 'coupon-10', discount: 10, expires: '2099-12-31' }],
    now: new Date('2026-05-02T00:00:00+08:00'),
  }), /找不到可用的優惠券/);
});

test('canAdjustBookingPrice allows only booking owner coach or admin in pending payment state', () => {
  const booking = { coach_id: 'coach-1', status: 'pending_payment', base_price: 1000, discount_amount: 100 };
  assert.equal(canAdjustBookingPrice({ actor: { id: 'coach-1', role: 'coach' }, booking }).ok, true);
  assert.equal(canAdjustBookingPrice({ actor: { id: 'coach-2', role: 'coach' }, booking }).ok, false);
  assert.equal(canAdjustBookingPrice({ actor: { id: 'admin-1', role: 'admin' }, booking }).ok, true);
});

test('calculateBookingPrice clamps total discounts and recomputes deposit/payout consistently', () => {
  const price = calculateBookingPrice({
    basePrice: 1200,
    baseDiscountPercent: 15,
    couponDiscountPercent: 50,
    coachCommission: 20,
  });

  assert.equal(price.discountAmount, 300);
  assert.equal(price.finalPrice, 900);
  assert.equal(price.depositPaid, 270);
  assert.equal(price.platformFee, 240);
  assert.equal(price.coachPayout, 960);
});

test('isBookingTimeAllowed rejects unavailable exception overlap and accepts rule-contained slots', () => {
  const baseArgs = {
    expectedTime: '2026-05-04T10:00:00+08:00',
    durationMinutes: 60,
    rules: [{ weekday: 1, start_time: '09:00', end_time: '12:00', slot_minutes: 30, is_active: true }],
    legacyAvailableTimes: null,
  };

  assert.equal(isBookingTimeAllowed({ ...baseArgs, exceptions: [] }).ok, true);
  assert.equal(isBookingTimeAllowed({
    ...baseArgs,
    exceptions: [{ exception_date: '2026-05-04', exception_type: 'unavailable', start_time: '10:30', end_time: '11:30' }],
  }).ok, false);
});
