-- Booking cancel fault and pricing safety migration
-- Purpose:
-- 1) Add structured cancellation responsibility to bookings.cancel_fault_party.
-- 2) Stop performance logic from relying on free-text cancel_reason matching.
-- 3) Add database-level guards for percentage / money safety where columns exist.
--
-- Valid cancel_fault_party values:
-- - student_fault
-- - coach_fault
-- - coach_pending_review
-- - platform_fault
-- - mutual_agreement
-- - system_expired_payment

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancel_fault_party TEXT;

COMMENT ON COLUMN public.bookings.cancel_fault_party IS
  'Structured cancellation responsibility: student_fault, coach_fault, coach_pending_review, platform_fault, mutual_agreement, system_expired_payment.';

-- Backfill only obvious legacy coach-cancel records into pending review.
-- This preserves old data without declaring final coach fault automatically.
UPDATE public.bookings
SET cancel_fault_party = 'coach_pending_review'
WHERE status = 'cancelled'
  AND cancel_fault_party IS NULL
  AND cancel_reason IS NOT NULL
  AND (
    cancel_reason ILIKE '%coach%'
    OR cancel_reason LIKE '%教練%'
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_cancel_fault_party_valid'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_cancel_fault_party_valid
      CHECK (
        cancel_fault_party IS NULL OR cancel_fault_party IN (
          'student_fault',
          'coach_fault',
          'coach_pending_review',
          'platform_fault',
          'mutual_agreement',
          'system_expired_payment'
        )
      ) NOT VALID;
  END IF;
END $$;

-- Money / percentage guardrails. Keep NOT VALID to avoid blocking deployment on legacy rows;
-- Antigravity can VALIDATE CONSTRAINT after auditing historical data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'coupon_discount'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_coupon_discount_range'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_coupon_discount_range
      CHECK (coupon_discount IS NULL OR (coupon_discount >= 0 AND coupon_discount <= 100)) NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'final_price'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_final_price_non_negative'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_final_price_non_negative
      CHECK (final_price IS NULL OR final_price >= 0) NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'platform_fee'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_platform_fee_non_negative'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_platform_fee_non_negative
      CHECK (platform_fee IS NULL OR platform_fee >= 0) NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'coach_payout'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_coach_payout_non_negative'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_coach_payout_non_negative
      CHECK (coach_payout IS NULL OR coach_payout >= 0) NOT VALID;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
