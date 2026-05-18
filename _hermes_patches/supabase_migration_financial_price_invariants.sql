-- ============================================================
-- UniCoach / AMIKE
-- Financial Price Invariants Migration
--
-- Suggested filename:
-- supabase_migration_financial_price_invariants.sql
--
-- Purpose:
-- 1. Prevent booking coach_payout/platform_fee from exceeding final_price.
-- 2. Prevent invalid legacy bookings from being linked to settlement batches.
-- 3. Provide a diagnostic view for legacy rows that need manual review.
--
-- Run in Supabase SQL editor as a privileged role.
-- This migration uses NOT VALID constraints so existing legacy rows do not
-- block deployment, while all new INSERT/UPDATE writes are still checked.
-- ============================================================

-- ============================================================
-- 1. Diagnostic helper and view
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_booking_financially_valid_for_settlement(
  p_final_price INTEGER,
  p_platform_fee INTEGER,
  p_coach_payout INTEGER
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    COALESCE(p_final_price, 0) >= 0
    AND COALESCE(p_platform_fee, 0) >= 0
    AND COALESCE(p_coach_payout, 0) >= 0
    AND COALESCE(p_platform_fee, 0) <= COALESCE(p_final_price, 0)
    AND COALESCE(p_coach_payout, 0) <= COALESCE(p_final_price, 0)
    AND (COALESCE(p_platform_fee, 0) + COALESCE(p_coach_payout, 0)) <= COALESCE(p_final_price, 0)
$$;

CREATE OR REPLACE VIEW public.booking_financial_invariant_violations AS
SELECT
  id,
  user_id,
  coach_id,
  status,
  payment_status,
  base_price,
  discount_amount,
  price_adjustment,
  final_price,
  platform_fee,
  coach_payout,
  settlement_id,
  created_at,
  updated_at
FROM public.bookings
WHERE NOT public.is_booking_financially_valid_for_settlement(final_price, platform_fee, coach_payout);

REVOKE ALL ON public.booking_financial_invariant_violations FROM anon, authenticated;
GRANT SELECT ON public.booking_financial_invariant_violations TO service_role;

-- ============================================================
-- 2. New-write constraints on bookings
-- ============================================================

-- The historical bookings_non_negative_money constraint incorrectly blocked
-- negative price_adjustment even though the product UI/route supports ±200 TWD.
-- Replace it with a version that keeps real money fields non-negative while
-- allowing bounded negative adjustment values.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_non_negative_money'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
    DROP CONSTRAINT bookings_non_negative_money;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_non_negative_money'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_non_negative_money
    CHECK (
      COALESCE(base_price, 0) >= 0
      AND COALESCE(discount_amount, 0) >= 0
      AND COALESCE(final_price, 0) >= 0
      AND COALESCE(deposit_paid, 0) >= 0
      AND COALESCE(platform_fee, 0) >= 0
      AND COALESCE(coach_payout, 0) >= 0
      AND COALESCE(coupon_discount, 0) >= 0
    ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_price_adjustment_bounds'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_price_adjustment_bounds
    CHECK (COALESCE(price_adjustment, 0) BETWEEN -200 AND 200) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_money_fields_non_negative'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_money_fields_non_negative
    CHECK (
      COALESCE(base_price, 0) >= 0
      AND COALESCE(discount_amount, 0) >= 0
      AND COALESCE(final_price, 0) >= 0
      AND COALESCE(deposit_paid, 0) >= 0
      AND COALESCE(platform_fee, 0) >= 0
      AND COALESCE(coach_payout, 0) >= 0
    ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_payout_not_over_final_price'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_payout_not_over_final_price
    CHECK (COALESCE(coach_payout, 0) <= COALESCE(final_price, 0)) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_platform_fee_not_over_final_price'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_platform_fee_not_over_final_price
    CHECK (COALESCE(platform_fee, 0) <= COALESCE(final_price, 0)) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_financial_split_not_over_final_price'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_financial_split_not_over_final_price
    CHECK ((COALESCE(platform_fee, 0) + COALESCE(coach_payout, 0)) <= COALESCE(final_price, 0)) NOT VALID;
  END IF;
END $$;

-- ============================================================
-- 3. Settlement-link guard for legacy invalid rows
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_booking_settlement_financial_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only guard rows being newly linked to a settlement batch.
  IF NEW.settlement_id IS NOT NULL
     AND (
       TG_OP = 'INSERT'
       OR (TG_OP = 'UPDATE' AND OLD.settlement_id IS DISTINCT FROM NEW.settlement_id)
     ) THEN
    IF NOT public.is_booking_financially_valid_for_settlement(
      NEW.final_price,
      NEW.platform_fee,
      NEW.coach_payout
    ) THEN
      RAISE EXCEPTION 'Cannot link financially invalid booking % to settlement batch', NEW.id;
    END IF;

    IF COALESCE(NEW.coach_payout, 0) <= 0 THEN
      RAISE EXCEPTION 'Cannot link booking % with non-positive coach_payout to settlement batch', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_booking_settlement_financial_invariants ON public.bookings;
CREATE TRIGGER trg_guard_booking_settlement_financial_invariants
BEFORE INSERT OR UPDATE OF settlement_id, final_price, platform_fee, coach_payout
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.guard_booking_settlement_financial_invariants();

-- ============================================================
-- 4. Optional privileged diagnostic query
-- ============================================================
-- After running this migration, check legacy violations before generating
-- settlement batches:
--
-- SELECT * FROM public.booking_financial_invariant_violations;
--
-- If rows are returned, do not auto-fix money silently. Review the original
-- booking/payment context and repair final_price/platform_fee/coach_payout
-- with an explicit admin-approved migration.
-- ============================================================
