import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  filterSettleableBookings,
  groupSettleableBookingsByCoach,
  buildSettlementBatchInsert,
  buildSettlementBookingUpdate,
  canMarkSettlementStatus,
} from '../lib/settlementRules.js';

const root = process.cwd();
const schema = readFileSync(join(root, 'supabase_schema.sql'), 'utf8');
const migrationPath = join(root, 'supabase_migration_settlement_financial_guards.sql');
const settlementsRpcPath = join(root, 'supabase_migration_settlements_rpc.sql');
const combinedSql = existsSync(migrationPath)
  ? `${schema}\n${readFileSync(migrationPath, 'utf8')}`
  : schema;
const settlementsRpcSql = existsSync(settlementsRpcPath)
  ? readFileSync(settlementsRpcPath, 'utf8')
  : '';

function compact(sql) {
  return sql.replace(/\s+/g, ' ');
}

test('filterSettleableBookings includes only completed bookings that are actually paid and un-settled', () => {
  const rows = [
    { id: 'ok', coach_id: 'coach-a', coach_payout: 700, status: 'completed', payment_status: 'paid', paid_at: '2026-05-01T00:00:00Z', settlement_id: null },
    { id: 'unpaid', coach_id: 'coach-a', coach_payout: 700, status: 'completed', payment_status: 'pending', paid_at: null, settlement_id: null },
    { id: 'no-paid-at', coach_id: 'coach-a', coach_payout: 700, status: 'completed', payment_status: 'paid', paid_at: null, settlement_id: null },
    { id: 'not-completed', coach_id: 'coach-a', coach_payout: 700, status: 'pending_completion', payment_status: 'paid', paid_at: '2026-05-01T00:00:00Z', settlement_id: null },
    { id: 'already-settled', coach_id: 'coach-a', coach_payout: 700, status: 'completed', payment_status: 'paid', paid_at: '2026-05-01T00:00:00Z', settlement_id: 'batch-1' },
  ];

  assert.deepEqual(filterSettleableBookings(rows).map((row) => row.id), ['ok']);
});

test('groupSettleableBookingsByCoach totals only positive eligible payouts per coach', () => {
  const groups = groupSettleableBookingsByCoach([
    { id: 'a1', coach_id: 'coach-a', coach_payout: 500, status: 'completed', payment_status: 'paid', paid_at: '2026-05-01T00:00:00Z', settlement_id: null },
    { id: 'a2', coach_id: 'coach-a', coach_payout: 300, status: 'completed', payment_status: 'paid', paid_at: '2026-05-02T00:00:00Z', settlement_id: null },
    { id: 'b1', coach_id: 'coach-b', coach_payout: 0, status: 'completed', payment_status: 'paid', paid_at: '2026-05-03T00:00:00Z', settlement_id: null },
  ]);

  assert.deepEqual(groups, [{ coachId: 'coach-a', total: 800, bookingIds: ['a1', 'a2'] }]);
});

test('settlement insert and booking update payloads are explicit and status-safe', () => {
  assert.deepEqual(buildSettlementBatchInsert({ month: '2026-05', coachId: 'coach-a', total: 800, bookingIds: ['a1', 'a2'] }), {
    month: '2026-05',
    coach_id: 'coach-a',
    total_amount: 800,
    booking_count: 2,
    status: 'pending',
  });
  assert.deepEqual(buildSettlementBookingUpdate('batch-1'), { settlement_id: 'batch-1' });
});

test('settlement status updates cannot revive cancelled batches or rollback paid batches', () => {
  assert.equal(canMarkSettlementStatus({ currentStatus: 'paid', nextStatus: 'pending' }).ok, false);
  assert.equal(canMarkSettlementStatus({ currentStatus: 'cancelled', nextStatus: 'paid' }).ok, false);
  assert.equal(canMarkSettlementStatus({ currentStatus: 'pending', nextStatus: 'paid' }).ok, true);
  assert.equal(canMarkSettlementStatus({ currentStatus: 'pending', nextStatus: 'cancelled' }).ok, true);
});

test('schema and migration enforce one active settlement batch per coach-month', () => {
  const sql = compact(combinedSql);
  assert.match(sql, /settlement_batches_unique_active_coach_month/i, 'active coach-month unique index is required');
  assert.match(sql, /CREATE UNIQUE INDEX[^;]+settlement_batches_unique_active_coach_month[^;]+ON (public\.)?settlement_batches\s*\(\s*month\s*,\s*coach_id\s*\)[^;]+WHERE\s*\(status\s*<>\s*'cancelled'\)/i, 'unique index must ignore cancelled batches only');
  assert.match(sql, /settlement_batches_non_negative_totals/i, 'settlement totals/count need non-negative DB CHECK');
});

test('paid settlement batches make financial fields immutable at DB trigger level', () => {
  const sql = compact(settlementsRpcSql);
  const standaloneGuardSql = compact(combinedSql);

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.guard_settlement_batch_status_transition\(\)/i, 'settlement status trigger function must exist');
  assert.match(sql, /IF OLD\.status = 'paid' THEN .*OLD\.total_amount IS DISTINCT FROM NEW\.total_amount.*RAISE EXCEPTION 'Paid settlement batch total_amount is immutable'/i, 'paid total_amount must be immutable');
  assert.match(sql, /IF OLD\.status = 'paid' THEN .*OLD\.booking_count IS DISTINCT FROM NEW\.booking_count.*RAISE EXCEPTION 'Paid settlement batch booking_count is immutable'/i, 'paid booking_count must be immutable');
  assert.match(sql, /BEFORE UPDATE OF status, paid_at, total_amount, booking_count ON public\.settlement_batches/i, 'trigger must fire for financial field updates');

  assert.match(standaloneGuardSql, /CREATE OR REPLACE FUNCTION public\.guard_settlement_batch_status_transition\(\)/i, 'standalone financial guards migration must also install the immutable trigger');
  assert.match(standaloneGuardSql, /IF OLD\.status = 'paid' THEN .*OLD\.total_amount IS DISTINCT FROM NEW\.total_amount.*RAISE EXCEPTION 'Paid settlement batch total_amount is immutable'/i, 'standalone migration must freeze paid total_amount');
  assert.match(standaloneGuardSql, /IF OLD\.status = 'paid' THEN .*OLD\.booking_count IS DISTINCT FROM NEW\.booking_count.*RAISE EXCEPTION 'Paid settlement batch booking_count is immutable'/i, 'standalone migration must freeze paid booking_count');
});
