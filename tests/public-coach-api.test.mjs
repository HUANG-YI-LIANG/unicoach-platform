import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const coachListRoute = readFileSync(join(root, 'app/api/coaches/route.js'), 'utf8');
const coachDetailRoute = readFileSync(join(root, 'app/api/coaches/[id]/route.js'), 'utf8');

function publicResponseSlice(routeSource, startMarker, endMarker) {
  const start = routeSource.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} must exist`);
  const end = routeSource.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} must exist after ${startMarker}`);
  return routeSource.slice(start, end);
}

test('public coach list API does not select or return private contact fields', () => {
  assert.doesNotMatch(
    coachListRoute,
    /users!inner\([^)]*\b(email|phone)\b[^)]*\)/,
    'public coach list must not select users.email or users.phone'
  );

  const formatter = publicResponseSlice(coachListRoute, 'function formatCoach', 'export async function GET');
  assert.doesNotMatch(formatter, /\bemail\s*:/, 'public coach list response must not include email');
  assert.doesNotMatch(formatter, /\bphone\s*:/, 'public coach list response must not include phone');
});

test('public coach detail API exposes only approved coaches and no private contact fields', () => {
  assert.match(
    coachDetailRoute,
    /\.eq\(\s*['"]approval_status['"]\s*,\s*['"]approved['"]\s*\)/,
    'public coach detail must restrict direct-id lookups to approved coaches'
  );
  assert.doesNotMatch(
    coachDetailRoute,
    /users!inner\([^)]*\b(email|phone)\b[^)]*\)/,
    'public coach detail must not select users.email or users.phone'
  );

  const formatter = publicResponseSlice(coachDetailRoute, 'const formattedCoach = {', 'const formattedReviews');
  assert.doesNotMatch(formatter, /\bemail\s*:/, 'public coach detail response must not include email');
  assert.doesNotMatch(formatter, /\bphone\s*:/, 'public coach detail response must not include phone');
});

test('public coach detail returns sanitized blocked slots instead of booking ids/status/payment expiry', () => {
  assert.match(
    coachDetailRoute,
    /const\s+publicBlockedSlots\s*=\s*\(bookings\s*\|\|\s*\[\]\)\s*\.filter[\s\S]{0,700}\.map\(\(booking\)\s*=>\s*\(\{/,
    'public detail route must explicitly map internal bookings to sanitized blocked slots'
  );
  assert.match(
    coachDetailRoute,
    /bookings:\s*publicBlockedSlots/,
    'public detail route should return only sanitized blocked slots as bookings payload'
  );

  const blockedSlotMap = publicResponseSlice(coachDetailRoute, '.map((booking) => ({', '}));\n\n    const formattedCoach');
  assert.match(blockedSlotMap, /expected_time:\s*booking\.expected_time/, 'sanitized slots keep only expected_time for calendar blocking');
  assert.match(blockedSlotMap, /duration_minutes:\s*booking\.duration_minutes/, 'sanitized slots keep only duration for calendar blocking');
  assert.doesNotMatch(blockedSlotMap, /\bid\s*:|\bstatus\s*:|payment_expires_at\s*:/, 'sanitized slots must not expose booking ids, statuses, or payment expiry');
});
