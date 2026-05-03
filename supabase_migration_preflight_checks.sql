-- Phase 6 migration preflight checks for AMIKE / UniCoach.
-- Run this read-only SQL before applying the Stage 2/4/5 migrations.
-- Expected result for every section: zero rows.
-- Do not apply production migrations until each violation query is empty or the
-- listed rows have been reviewed and intentionally cleaned up.

-- 1) booking_time_conflicts
-- Detect duplicate or overlapping active bookings for the same coach and time.
-- This protects the Stage 2 booking transaction guards / exclusion constraints.
SELECT
  'booking_time_conflicts' AS check_name,
  b1.id AS booking_id,
  b2.id AS conflicting_booking_id,
  b1.coach_id,
  b1.expected_time AS expected_time,
  b2.expected_time AS conflicting_expected_time,
  b1.status AS status,
  b2.status AS conflicting_status
FROM bookings b1
JOIN bookings b2
  ON b1.coach_id = b2.coach_id
 AND b1.id < b2.id
 AND b1.status IN ('pending_payment', 'scheduled', 'in_progress', 'pending_completion')
 AND b2.status IN ('pending_payment', 'scheduled', 'in_progress', 'pending_completion')
 AND b1.expected_time = b2.expected_time
ORDER BY b1.coach_id, b1.expected_time;

-- 2) booking_money_violations
-- Detect rows that would violate non-negative money constraints.
SELECT
  'booking_money_violations' AS check_name,
  id AS booking_id,
  base_price,
  discount_amount,
  final_price,
  deposit_paid,
  coach_payout,
  platform_fee,
  price_adjustment,
  coupon_discount
FROM bookings
WHERE COALESCE(base_price, 0) < 0
   OR COALESCE(discount_amount, 0) < 0
   OR COALESCE(final_price, 0) < 0
   OR COALESCE(deposit_paid, 0) < 0
   OR COALESCE(coach_payout, 0) < 0
   OR COALESCE(platform_fee, 0) < 0
   OR COALESCE(price_adjustment, 0) < 0
   OR COALESCE(coupon_discount, 0) < 0
ORDER BY created_at DESC NULLS LAST, id;

-- 3) booking_paid_state_violations
-- Detect payment workflow inconsistencies before enabling DB-level consistency guards.
SELECT
  'booking_paid_state_violations' AS check_name,
  id AS booking_id,
  status,
  payment_status,
  paid_at,
  payment_expires_at,
  final_price,
  deposit_paid
FROM bookings
WHERE (payment_status = 'paid' AND paid_at IS NULL)
   OR (payment_status <> 'paid' AND paid_at IS NOT NULL)
   OR (status IN ('scheduled', 'in_progress', 'pending_completion', 'completed') AND payment_status <> 'paid')
   OR (payment_status = 'paid' AND payment_expires_at IS NOT NULL)
ORDER BY created_at DESC NULLS LAST, id;

-- 4) settlement_duplicate_active_batches
-- Detect rows that would violate the Stage 5 same-coach/same-month active batch unique index.
SELECT
  'settlement_duplicate_active_batches' AS check_name,
  coach_id,
  month,
  COUNT(*) AS active_batch_count,
  ARRAY_AGG(id ORDER BY created_at) AS settlement_batch_ids
FROM settlement_batches
WHERE status <> 'cancelled'
GROUP BY coach_id, month
HAVING COUNT(*) > 1
ORDER BY month DESC, coach_id;

-- 5) settlement_total_violations
-- Detect settlement totals that would violate non-negative financial constraints.
SELECT
  'settlement_total_violations' AS check_name,
  id AS settlement_batch_id,
  coach_id,
  month,
  status,
  total_amount,
  booking_count
FROM settlement_batches
WHERE COALESCE(total_amount, 0) < 0
   OR COALESCE(booking_count, 0) < 0
ORDER BY created_at DESC NULLS LAST, id;

-- 6) report_integrity_violations
-- Detect reports that do not map to a valid booking/coach relationship used by
-- the Stage 3 report and completion workflow.
SELECT
  'report_integrity_violations' AS check_name,
  lr.id AS report_id,
  lr.booking_id,
  lr.coach_id AS report_coach_id,
  b.coach_id AS booking_coach_id,
  b.status AS booking_status
FROM learning_reports lr
LEFT JOIN bookings b ON b.id = lr.booking_id
WHERE b.id IS NULL
   OR lr.coach_id IS DISTINCT FROM b.coach_id
ORDER BY lr.created_at DESC NULLS LAST, lr.id;

-- 7) optional_payment_ready_settlement_preview
-- This is not a violation. It previews the rows that Stage 5 settlement should
-- be able to pick up after the migration guards are applied.
SELECT
  'optional_payment_ready_settlement_preview' AS check_name,
  coach_id,
  COUNT(*) AS settleable_booking_count,
  SUM(coach_payout) AS expected_total_amount
FROM bookings
WHERE status = 'completed'
  AND payment_status = 'paid'
  AND paid_at IS NOT NULL
  AND settlement_id IS NULL
  AND COALESCE(coach_payout, 0) > 0
GROUP BY coach_id
ORDER BY coach_id;
