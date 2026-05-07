import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const statusRoutePath = join(root, 'app/api/bookings/[id]/status/route.js');
const workflowPath = join(root, 'lib/bookingWorkflow.js');
const migrationPath = join(root, 'supabase_migration_booking_completion.sql');
const statusRouteSource = readFileSync(statusRoutePath, 'utf8');
const workflowSource = readFileSync(workflowPath, 'utf8');

function normalize(source) {
  return source.replace(/\s+/g, ' ');
}

test('pending_payment cannot be cancelled by coach in both route and workflow rules', () => {
  const routePendingRule = statusRouteSource.match(/pending_payment\s*:\s*\{[\s\S]*?\}/)?.[0] || '';
  const workflowPendingRule = workflowSource.match(/pending_payment\s*:\s*\{[\s\S]*?\}/)?.[0] || '';

  assert.match(routePendingRule, /student\s*:\s*\[\s*['"]cancelled['"]\s*\]/, 'student may still cancel pending_payment');
  assert.doesNotMatch(routePendingRule, /coach\s*:\s*\[[^\]]*['"]cancelled['"]/i, 'route rule must not allow coach to cancel pending_payment');
  assert.doesNotMatch(workflowPendingRule, /coach\s*:\s*\[[^\]]*['"]cancelled['"]/i, 'workflow rule must not allow coach to cancel pending_payment');
});

test('completed transition requires class ended, paid booking, and formal learning report', () => {
  assert.match(workflowSource, /canCompleteBooking|validateBookingCompletion/i, 'workflow must expose a completion validation helper');
  assert.match(workflowSource, /expected_time[\s\S]*duration_minutes|duration_minutes[\s\S]*expected_time/i, 'completion validation must use expected_time + duration_minutes');
  assert.match(workflowSource, /payment_status[\s\S]*paid|paid[\s\S]*payment_status/i, 'completion validation must require paid booking');
  assert.match(statusRouteSource, /newStatus\s*===\s*['"]completed['"][\s\S]*learning_reports[\s\S]*__AI_DRAFT__/i, 'status route must require a formal non-AI-draft learning report');
  assert.match(statusRouteSource, /canCompleteBooking|validateBookingCompletion/i, 'status route must call completion validation before completing');
});

test('completed status update calls complete_booking_with_referral RPC instead of direct booking update', () => {
  const normalized = normalize(statusRouteSource);
  assert.match(statusRouteSource, /\.rpc\(\s*['"]complete_booking_with_referral['"]/i, 'completed transition must call transactional completion RPC');
  assert.match(statusRouteSource, /p_booking_id\s*:\s*id/, 'RPC must receive booking id');
  assert.match(statusRouteSource, /p_actor_id\s*:\s*auth\.user\.id/, 'RPC must receive actor id for auditability');
  assert.match(statusRouteSource, /\.eq\(\s*['"]status['"]\s*,\s*booking\.status\s*\)/, 'non-completion direct updates must keep optimistic status guard');
  assert.doesNotMatch(normalized, /newStatus === ['"]completed['"][^?;]*\.from\(['"]bookings['"]\) \.update/, 'completed transition must not directly update bookings outside RPC');
});

test('booking completion migration defines transactional RPC and idempotent referral reward constraint', () => {
  assert.equal(existsSync(migrationPath), true, 'supabase_migration_booking_completion.sql must exist');
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.reward_logs/i, 'migration must create reward_logs');
  assert.match(migration, /UNIQUE\s*\(\s*order_id\s*,\s*reward_type\s*\)/i, 'reward_logs must prevent duplicate order reward type');
  assert.match(migration, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.complete_booking_with_referral/i, 'migration must create completion RPC');
  assert.match(migration, /LANGUAGE\s+plpgsql[\s\S]*SECURITY\s+DEFINER/i, 'RPC must be a PostgreSQL transaction function');
  assert.match(migration, /FOR\s+UPDATE/i, 'RPC must lock the booking row');
  assert.match(migration, /learning_reports[\s\S]*__AI_DRAFT__/i, 'RPC must require formal learning report');
  assert.match(migration, /expected_time[\s\S]*duration_minutes|duration_minutes[\s\S]*expected_time/i, 'RPC must reject future/incomplete classes');
  assert.match(migration, /referral_completed/i, 'RPC must update referral completion state');
  assert.match(migration, /reward_logs/i, 'RPC must insert referral reward log');
});
