import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const preflightSqlPath = join(root, 'supabase_migration_preflight_checks.sql');
const paymentWorkflowMigrationPath = join(root, 'supabase_migration_payment_workflow_columns.sql');
const smokeChecklistPath = join(root, 'docs', 'phase6-smoke-test-checklist.md');

function readRequiredFile(path, description) {
  assert.ok(existsSync(path), `${description} must exist`);
  return readFileSync(path, 'utf8');
}

function normalize(text) {
  return text.replace(/\s+/g, ' ');
}

test('migration preflight SQL covers every high-risk guard before applying migrations', () => {
  const sql = normalize(readRequiredFile(preflightSqlPath, 'migration preflight SQL'));

  assert.match(sql, /booking_time_conflicts/i, 'must detect duplicate or overlapping active bookings before exclusion constraints');
  assert.match(sql, /expected_time/i, 'booking conflict checks must use the API/schema booking timestamp column expected_time');
  assert.doesNotMatch(sql, /\.booking_time\b/i, 'preflight SQL must not use obsolete bookings.booking_time column');
  assert.match(sql, /base_price/i, 'money checks must use canonical bookings.base_price');
  assert.match(sql, /deposit_paid/i, 'money checks must use canonical bookings.deposit_paid');
  assert.doesNotMatch(sql, /deposit_amount/i, 'booking money checks must not use obsolete bookings.deposit_amount');
  assert.match(sql, /booking_paid_state_violations/i, 'must detect status/payment_status/paid_at inconsistencies');
  assert.match(sql, /settlement_duplicate_active_batches/i, 'must detect duplicate active settlement batches before unique partial index');
  assert.match(sql, /availability_exception_overlaps/i, 'must detect same-coach same-date overlapping availability exceptions before exclusion constraints');
  assert.match(sql, /coach_availability_exceptions/i, 'availability exception preflight must inspect coach_availability_exceptions');
  assert.match(sql, /timerange\s*\(\s*(?:\w+\.)?start_time\s*,\s*(?:\w+\.)?end_time\s*,\s*'\[\)'\s*\)\s*&&\s*timerange/i, 'availability exception preflight must use half-open timerange overlap checks');
  assert.match(sql, /settlement_total_violations/i, 'must detect invalid settlement totals before CHECK constraints');
  assert.match(sql, /report_integrity_violations/i, 'must detect report records that cannot satisfy workflow expectations');
});

test('payment workflow migration closes live DB schema gaps before payment and settlement APIs deploy', () => {
  const sql = normalize(readRequiredFile(paymentWorkflowMigrationPath, 'payment workflow column migration'));

  assert.match(sql, /ALTER TABLE (IF EXISTS )?(public\.)?bookings/i, 'migration must alter bookings table');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS payment_status\s+TEXT/i, 'migration must add bookings.payment_status');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS paid_at\s+TIMESTAMPTZ/i, 'migration must add bookings.paid_at');
  assert.match(sql, /CHECK\s*\([^;]*payment_status\s+IN\s*\([^)]*'pending'[^)]*'paid'[^)]*'refunded'[^)]*\)/i, 'payment_status must be constrained');
  assert.match(sql, /UPDATE (public\.)?bookings[\s\S]*payment_status\s*=\s*'paid'[\s\S]*status\s+IN\s*\([^)]*'scheduled'[^)]*'completed'[^)]*\)/i, 'migration must backfill already-active/completed bookings as paid for compatibility');
  assert.match(sql, /paid_at\s*=\s*COALESCE\s*\(/i, 'migration must backfill paid_at without overwriting existing timestamps');
});

test('phase 6 smoke checklist documents manual acceptance flows and migration order', () => {
  const checklist = readRequiredFile(smokeChecklistPath, 'phase 6 smoke checklist');

  for (const requiredSection of [
    'Migration order',
    'Preflight checks',
    'Authentication and profile smoke test',
    'Coach approval gate smoke test',
    'Booking and pricing smoke test',
    'Payment, report, and completion smoke test',
    'Settlement smoke test',
    'Rollback notes',
  ]) {
    assert.ok(checklist.includes(requiredSection), `checklist must include ${requiredSection}`);
  }

  assert.match(checklist, /supabase_migration_booking_transaction_guards\.sql[\s\S]*supabase_migration_payment_workflow_columns\.sql[\s\S]*supabase_migration_schema_consistency_guards\.sql[\s\S]*supabase_migration_settlement_financial_guards\.sql/i, 'migration order must include booking guards, payment workflow columns, schema consistency, and settlement guards in dependency order');
});
