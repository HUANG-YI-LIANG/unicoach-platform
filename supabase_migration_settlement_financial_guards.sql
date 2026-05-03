-- Stage 5 settlement financial guards.
-- Run after Stage 4 schema consistency migration.
-- The unique partial index prevents duplicate active settlement batches for the same coach/month.

CREATE UNIQUE INDEX IF NOT EXISTS settlement_batches_unique_active_coach_month
ON public.settlement_batches (month, coach_id)
WHERE (status <> 'cancelled');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settlement_batches_non_negative_totals'
  ) THEN
    ALTER TABLE public.settlement_batches
    ADD CONSTRAINT settlement_batches_non_negative_totals
    CHECK (
      total_amount >= 0
      AND booking_count >= 0
    ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_unsettled_paid_completed
ON public.bookings (completed_at, coach_id)
WHERE (
  status = 'completed'
  AND payment_status = 'paid'
  AND paid_at IS NOT NULL
  AND settlement_id IS NULL
);
