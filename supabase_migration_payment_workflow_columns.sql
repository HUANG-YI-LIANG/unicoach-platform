-- Stage 7 payment workflow schema gap migration.
-- Purpose: close the live DB gap discovered by preflight where bookings lacks
-- payment_status and paid_at, while Stage 3/5 APIs already depend on them.
-- Run after supabase_migration_booking_transaction_guards.sql and before
-- supabase_migration_schema_consistency_guards.sql.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Keep the enum constraint explicit even for databases that predate the
-- canonical schema. Guarded for safe re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_status_check'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'refunded')) NOT VALID;
  END IF;
END $$;

-- Conservative compatibility backfill for legacy rows:
-- Before payment_status existed, rows already past pending_payment represented
-- bookings that the app treated as confirmed/paid enough to schedule, run,
-- complete, or refund. Set those rows to paid/refunded so the new Stage 3/5
-- API guards and settlement eligibility can reason over them.
UPDATE public.bookings
SET
  payment_status = 'paid',
  paid_at = COALESCE(paid_at, completed_at, created_at, NOW()),
  payment_expires_at = NULL
WHERE status IN ('scheduled', 'in_progress', 'pending_completion', 'completed', 'disputed')
  AND COALESCE(payment_status, 'pending') <> 'paid';

UPDATE public.bookings
SET
  payment_status = 'refunded'
WHERE status = 'refunded'
  AND COALESCE(payment_status, 'pending') <> 'refunded';

UPDATE public.bookings
SET payment_status = 'pending'
WHERE payment_status IS NULL;

ALTER TABLE public.bookings
ALTER COLUMN payment_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status_paid_at
ON public.bookings(payment_status, paid_at);
