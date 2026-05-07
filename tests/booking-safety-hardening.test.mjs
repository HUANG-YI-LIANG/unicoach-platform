import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const routePath = join(root, 'app', 'api', 'bookings', 'route.js');
const migrationPath = join(root, 'supabase_migration_booking_safety.sql');
const routeSource = readFileSync(routePath, 'utf8');

function normalize(text) {
  return text.replace(/\s+/g, ' ');
}

test('booking safety migration defines advisory-lock RPC and coupon redemption uniqueness', () => {
  assert.ok(existsSync(migrationPath), 'supabase_migration_booking_safety.sql must exist');
  const sql = normalize(readFileSync(migrationPath, 'utf8'));

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.coupon_redemptions\s*\(/i, 'must create coupon_redemptions table');
  assert.match(sql, /user_id\s+UUID\s+NOT NULL/i, 'coupon_redemptions must store user_id');
  assert.match(sql, /coupon_id\s+TEXT\s+NOT NULL/i, 'coupon_redemptions must store coupon_id');
  assert.match(sql, /booking_id\s+UUID\s+NOT NULL/i, 'coupon_redemptions must store booking_id');
  assert.match(sql, /UNIQUE\s*\(\s*user_id\s*,\s*coupon_id\s*\)/i, 'coupon_redemptions must prevent duplicate coupon use per user');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.create_booking_safe\s*\(/i, 'must define create_booking_safe RPC');
  assert.match(sql, /pg_advisory_xact_lock/i, 'RPC must use transaction-scoped advisory locks');
  assert.match(sql, /tstzrange\s*\(/i, 'RPC must re-check booking time overlap inside the lock');
  assert.match(sql, /INSERT INTO public\.coupon_redemptions/i, 'RPC must redeem coupon in the same transaction as booking creation');
});

test('POST /api/bookings creates bookings through create_booking_safe RPC and maps conflict errors', () => {
  assert.match(routeSource, /\.rpc\(\s*['"]create_booking_safe['"]/i, 'booking POST must call create_booking_safe RPC');
  assert.match(routeSource, /p_bookings\s*:/, 'RPC call must pass booking rows');
  assert.match(routeSource, /p_user_id\s*:\s*userId/, 'RPC call must bind redemption to authenticated user');
  assert.match(routeSource, /couponId:\s*couponResult\.couponId/, 'booking creation call must use the server-validated coupon id');
  assert.match(routeSource, /p_coupon_id\s*:\s*couponId/, 'RPC helper must forward the validated coupon id to SQL');
  assert.match(routeSource, /優惠券已使用|23505|unique/i, 'duplicate coupon redemption must be mapped to a user-facing conflict');
  assert.match(routeSource, /時段.*衝突|23P01|booking_time_conflict/i, 'double booking conflict must be mapped to 409');
});

test('first purchase discount treats pending payment bookings as effective orders', () => {
  const normalized = normalize(routeSource);
  assert.match(normalized, /ACTIVE_BOOKING_STATUSES\s*=\s*\[[^\]]*['"]pending_payment['"][^\]]*['"]scheduled['"][^\]]*['"]completed['"]/i, 'active status set must include pending_payment with scheduled/completed orders');
  assert.match(normalized, /\.eq\(\s*['"]user_id['"]\s*,\s*userId\s*\)\s*\.in\(\s*['"]status['"]\s*,\s*ACTIVE_BOOKING_STATUSES\s*\)/i, 'first-purchase query must filter by ACTIVE_BOOKING_STATUSES');
});

test('GET /api/bookings returns role-aware DTOs instead of spreading raw booking rows', () => {
  assert.doesNotMatch(routeSource, /\.select\s*\(\s*`[\s\S]*\*[\s\S]*`\s*\)/, 'GET must not select raw * from bookings');
  assert.doesNotMatch(routeSource, /\.map\s*\([^=]*=>\s*\(\{\s*\.\.\.b\s*,/, 'GET must not spread raw booking rows');
  assert.match(routeSource, /formatBookingForRole|buildBookingDto/i, 'GET must format bookings through a role-aware DTO helper');
  assert.match(routeSource, /case ['"]admin['"]|auth\.user\.role === ['"]admin['"]/, 'DTO must handle admin role');
  assert.match(routeSource, /case ['"]coach['"]|auth\.user\.role === ['"]coach['"]/, 'DTO must handle coach role');
  assert.match(routeSource, /case ['"]student['"]|case ['"]user['"]|auth\.user\.role === ['"]user['"]/, 'DTO must handle student/user role');
  assert.doesNotMatch(routeSource, /coachPayout.*role === ['"]user['"]|platformFee.*role === ['"]user['"]/, 'student DTO must not expose platform_fee or coach_payout');
  assert.match(routeSource, /case ['"]admin['"][\s\S]*platform_fee[\s\S]*coach_payout/, 'admin DTO may include financial internals');
  const coachCase = routeSource.match(/case ['"]coach['"]:[\s\S]*?case ['"]student['"]:/)?.[0] || '';
  assert.doesNotMatch(coachCase, /coach_payout|platform_fee/, 'coach DTO must not expose internal payout fields');
});
