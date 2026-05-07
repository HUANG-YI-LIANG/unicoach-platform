import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { calculateBookingPrice, getServerCouponDiscount } from '../lib/bookingSecurity.js';

const root = process.cwd();
const statusRoutePath = join(root, 'app', 'api', 'bookings', '[id]', 'status', 'route.js');
const bookingRoutePath = join(root, 'app', 'api', 'bookings', 'route.js');
const adminSettingsRoutePath = join(root, 'app', 'api', 'admin', 'settings', 'route.js');
const coachPerformancePath = join(root, 'lib', 'coachPerformance.js');
const migrationPath = join(root, 'supabase_migration_cancel_fault.sql');

const statusRouteSource = readFileSync(statusRoutePath, 'utf8');
const bookingRouteSource = readFileSync(bookingRoutePath, 'utf8');
const adminSettingsRouteSource = readFileSync(adminSettingsRoutePath, 'utf8');

function normalize(text) {
  return text.replace(/\s+/g, ' ');
}

test('cancel fault migration adds structured cancel_fault_party with coach fault values', () => {
  assert.ok(existsSync(migrationPath), 'supabase_migration_cancel_fault.sql must exist');
  const sql = normalize(readFileSync(migrationPath, 'utf8'));

  assert.match(sql, /ALTER TABLE public\.bookings/i, 'migration must alter bookings');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS cancel_fault_party TEXT/i, 'bookings must have cancel_fault_party text column');
  assert.match(sql, /coach_pending_review/i, 'migration must document/allow coach_pending_review');
  assert.match(sql, /coach_fault/i, 'migration must document/allow coach_fault');
});

test('coach cancellation writes structured pending-review fault party instead of relying on cancel_reason text', () => {
  assert.match(statusRouteSource, /cancel_fault_party\s*=\s*['"]coach_pending_review['"]|cancel_fault_party\s*:\s*['"]coach_pending_review['"]/, 'coach-initiated cancellations must set cancel_fault_party');
  assert.match(statusRouteSource, /newStatus\s*===\s*['"]cancelled['"][\s\S]*role\s*===\s*['"]coach['"]|role\s*===\s*['"]coach['"][\s\S]*newStatus\s*===\s*['"]cancelled['"]/, 'fault party must be conditional on coach cancellation');
});

test('coachPerformance counts malicious cancels only from structured coach fault fields', async () => {
  assert.ok(existsSync(coachPerformancePath), 'lib/coachPerformance.js must exist');
  const source = readFileSync(coachPerformancePath, 'utf8');
  assert.match(source, /cancel_fault_party/i, 'coach performance must use cancel_fault_party');
  assert.doesNotMatch(source, /cancel_reason[\s\S]*includes|includes[\s\S]*cancel_reason/, 'malicious cancel logic must not rely on cancel_reason.includes');

  const { calculateCoachPerformance } = await import('../lib/coachPerformance.js');
  const result = calculateCoachPerformance([
    { status: 'cancelled', cancel_fault_party: 'coach_fault' },
    { status: 'cancelled', cancel_fault_party: 'coach_pending_review' },
    { status: 'cancelled', cancel_fault_party: 'student_fault', cancel_reason: '教練文字不應影響' },
    { status: 'completed', cancel_fault_party: 'coach_fault' },
    { status: 'cancelled', cancel_reason: '教練臨時取消' },
  ]);

  assert.equal(result.malicious_cancels, 2);
});

test('booking creation blocks required safety fields instead of silent schema fallback deletion', () => {
  assert.doesNotMatch(bookingRouteSource, /insertBookingsWithSchemaFallback/i, 'legacy schema fallback helper must not be used for booking creation');
  assert.match(bookingRouteSource, /REQUIRED_BOOKING_SAFETY_FIELDS/i, 'route must define required safety fields');
  for (const field of ['expected_time', 'duration_minutes', 'payment_expires_at', 'base_price', 'final_price', 'attendees_count', 'plan_id']) {
    assert.match(bookingRouteSource, new RegExp(field), `${field} must be treated as a required safety field`);
  }
  assert.match(bookingRouteSource, /missing_required_booking_safety_field|validateRequiredBookingSafetyFields|throw new Error/i, 'missing required safety fields must throw before RPC insert');
});

test('booking price clamps discounts and commission to non-negative rounded money values', () => {
  const price = calculateBookingPrice({
    basePrice: 1000.49,
    baseDiscountPercent: 250,
    couponDiscountPercent: -30,
    coachCommission: 150,
  });

  assert.equal(price.totalDiscountPercent, 100);
  assert.equal(price.discountAmount, 300);
  assert.equal(price.finalPrice, 700);
  assert.equal(price.depositPaid, 210);
  assert.equal(price.platformFee, 1000);
  assert.equal(price.coachPayout, 0);
  for (const value of [price.discountAmount, price.finalPrice, price.depositPaid, price.platformFee, price.coachPayout]) {
    assert.equal(Number.isInteger(value), true, 'all money outputs must be rounded integers');
    assert.equal(value >= 0, true, 'all money outputs must be non-negative');
  }
});

test('coupon discount values are clamped server-side instead of creating over-100 percent discounts', () => {
  const discount = getServerCouponDiscount({
    requestedCouponId: 'coupon-overconfigured',
    claimedCoupons: [{ id: 'coupon-overconfigured', discount: 999, expires: '2099-12-31' }],
    now: new Date('2026-05-02T00:00:00+08:00'),
  });

  assert.equal(discount.percent, 100);
});

test('admin settings route clamps percentage settings before upsert', () => {
  assert.match(adminSettingsRouteSource, /clampSettingValue|clampPercent|normalizeSettingValue/i, 'admin settings POST must normalize setting values');
  assert.match(adminSettingsRouteSource, /commission_rate/i, 'commission_rate must be included in clamp handling');
  assert.match(adminSettingsRouteSource, /commission_discount/i, 'commission_discount must be included in clamp handling');
  assert.match(adminSettingsRouteSource, /Math\.min\(\s*100|100\s*\)/i, 'percentage settings must be capped at 100');
  assert.match(adminSettingsRouteSource, /Math\.max\(\s*0|0\s*,/i, 'percentage settings must be floored at 0');
});
