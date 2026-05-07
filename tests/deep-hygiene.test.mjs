import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const forgotPasswordRoute = read('app/api/auth/forgot-password/route.js');
const resetPasswordRoute = read('app/api/auth/reset-password/route.js');
const loginRoute = read('app/api/auth/login/route.js');
const bookingsRoute = read('app/api/bookings/route.js');
const coachesRoute = read('app/api/coaches/route.js');
const videosFeedRoute = read('app/api/videos/feed/route.js');
const reviewsRoute = read('app/api/reviews/route.js');
const coachPerformance = read('lib/coachPerformance.js');

test('auth and booking production logs do not print raw email, bookingId, or roomId values', () => {
  for (const [label, source] of [
    ['forgot-password', forgotPasswordRoute],
    ['reset-password', resetPasswordRoute],
    ['login', loginRoute],
    ['bookings', bookingsRoute],
  ]) {
    assert.doesNotMatch(
      source,
      /console\.(?:log|warn)\s*\([^\n]*(?:\$\{\s*(?:normalizedEmail|user\.email|userProfile\.email|email|bookingId|existingRoom\.id|newRoom\.id)\s*\})/,
      `${label} must not log raw email, bookingId, or room id values`,
    );
  }

  assert.match(forgotPasswordRoute, /maskEmail|maskIdentifier/, 'forgot-password logs should use masking when identity context is needed');
  assert.match(resetPasswordRoute, /maskEmail|maskIdentifier/, 'reset-password logs should use masking when identity context is needed');
  assert.match(loginRoute, /maskEmail|maskIdentifier/, 'login logs should use masking when identity context is needed');
  assert.match(bookingsRoute, /maskIdentifier/, 'booking auto-chat logs should mask booking and room identifiers');
  assert.doesNotMatch(loginRoute, /details\s*:\s*(?:err|insertError)\.message/, 'login route must not return raw internal error details to clients');

  for (const [label, source] of [
    ['forgot-password', forgotPasswordRoute],
    ['reset-password', resetPasswordRoute],
    ['login', loginRoute],
    ['bookings', bookingsRoute],
    ['coaches', coachesRoute],
    ['videos-feed', videosFeedRoute],
    ['reviews', reviewsRoute],
    ['coach-performance', coachPerformance],
  ]) {
    assert.doesNotMatch(source, /console\.(?:error|warn)\([^,\n]+,\s*(?:tokenError|emailError|profileError|passwordError|markUsedError|chatErr|error|err|insertError|e)\s*\)/, `${label} must not log raw error objects`);
    assert.match(source, /safeErrorDetails/, `${label} should log bounded safe error context`);
  }
});

test('public coach list API uses explicit coach and related-data allowlists without raw coach row spreading', () => {
  assert.match(coachesRoute, /PUBLIC_COACH_LIST_SELECT/, 'coach list must define a public coach select allowlist');
  assert.doesNotMatch(coachesRoute, /\.select\(\s*['"]\*,\s*users!inner/, 'coach list must not select all coach columns');
  assert.doesNotMatch(coachesRoute, /\.\.\.coach/, 'coach list must not spread raw coach rows into DTOs or availability inputs');

  for (const requiredField of ['user_id', 'university', 'location', 'service_areas', 'base_price', 'commission_rate', 'referral_code']) {
    assert.match(coachesRoute, new RegExp(requiredField), `coach list allowlist should include ${requiredField}`);
  }
});

test('video feed API uses a public video allowlist and never spreads raw video rows', () => {
  assert.match(videosFeedRoute, /PUBLIC_VIDEO_FEED_SELECT/, 'video feed must define a public video select allowlist');
  assert.doesNotMatch(videosFeedRoute, /\.select\(\s*['"]\*['"]\s*\)/, 'video feed must not select all video columns');
  assert.doesNotMatch(videosFeedRoute, /\.\.\.v\b|\.\.\.video\b/, 'video feed must not spread raw video rows into responses');

  for (const requiredField of ['id', 'video_url', 'title', 'category', 'coach_id', 'view_count', 'like_count', 'share_count']) {
    assert.match(videosFeedRoute, new RegExp(requiredField), `video feed allowlist should include ${requiredField}`);
  }
});

test('review submission API reads only booking fields required for authorization and insertion', () => {
  assert.match(reviewsRoute, /REVIEW_BOOKING_SELECT/, 'review route must define a booking allowlist');
  assert.doesNotMatch(reviewsRoute, /\.from\(['"]bookings['"]\)[\s\S]{0,120}\.select\(\s*['"]\*['"]\s*\)/, 'review route must not select all booking columns');

  for (const requiredField of ['id', 'user_id', 'coach_id', 'status']) {
    assert.match(reviewsRoute, new RegExp(requiredField), `review booking allowlist should include ${requiredField}`);
  }

  assert.match(reviewsRoute, /Number\.isFinite\(normalizedRating\)/, 'review route must reject non-numeric ratings before insert');
  assert.match(reviewsRoute, /rating === null \|\| rating === undefined/, 'review route must reject null or missing ratings before numeric coercion');
  assert.match(reviewsRoute, /typeof rating === 'string' && rating\.trim\(\) === ''/, 'review route must reject empty string ratings before numeric coercion');
  assert.match(reviewsRoute, /normalizedRating < 1 \|\| normalizedRating > 5/, 'review route must reject out-of-range ratings instead of silently clamping');
  assert.doesNotMatch(reviewsRoute, /Math\.max\(1,\s*Math\.min\(5,\s*normalizedRating\)\)/, 'review route must not silently clamp invalid rating values');
  assert.match(reviewsRoute, /status:\s*400/, 'invalid review ratings should return a clean 400 response');
});

test('booking route keeps high-risk reads on explicit allowlists', () => {
  assert.match(bookingsRoute, /GET_BOOKING_FIELDS/, 'booking list must retain explicit GET booking field allowlist');
  assert.match(bookingsRoute, /BOOKING_PLAN_SELECT/, 'booking creation must define an active coach plan allowlist');
  assert.doesNotMatch(bookingsRoute, /\.from\(['"]coach_plans['"]\)[\s\S]{0,160}\.select\(\s*['"]\*['"]\s*\)/, 'booking creation must not select all coach plan columns');
  assert.doesNotMatch(bookingsRoute, /\.\.\.b\b|\.\.\.booking\b/, 'booking response DTO must not spread raw booking rows');
  assert.doesNotMatch(bookingsRoute, /authUserError[\s\S]{0,220}couponError\.message/, 'booking coupon auth lookup errors must not be returned to clients as raw messages');
  assert.match(bookingsRoute, /Coupon auth lookup error:[\s\S]{0,80}safeErrorDetails\(authUserError\)/, 'booking coupon auth lookup errors should be logged with safe details only');
});

test('coach performance reads only required fields and includes cancellation fault data used by metrics', () => {
  assert.doesNotMatch(coachPerformance, /from\(['"]platform_settings['"]\)[\s\S]{0,120}\.select\(\s*['"]\*['"]\s*\)/, 'coach performance must not select all platform settings columns');
  assert.match(coachPerformance, /select\(['"]key, value['"]\)/, 'coach performance settings read should be key/value allowlisted');
  assert.match(coachPerformance, /select\(['"][^'"]*cancel_fault_party[^'"]*['"]\)/, 'coach performance booking read must include cancel_fault_party used by malicious cancel logic');
});
