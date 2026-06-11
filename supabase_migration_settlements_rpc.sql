-- ============================================================
-- UniCoach / AMIKE
-- Settlement + Payment Financial Safety RPC Migration
--
-- Suggested filename:
-- supabase_migration_settlements_rpc.sql
--
-- Purpose:
-- 1. Move settlement generation into PostgreSQL transaction-safe RPC.
-- 2. Move settlement paid/cancelled transition into PostgreSQL RPC.
-- 3. Move booking payment confirmation into PostgreSQL RPC.
-- 4. Add DB constraints/triggers to prevent duplicate settlement,
--    duplicate payout, orphan batches, paid-batch unlink, and
--    settlement total/count mismatch.
--
-- Run in Supabase SQL editor as a privileged role.
-- ============================================================

-- ============================================================
-- 0. Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Required columns / indexes / foreign keys
-- ============================================================

-- Ensure bookings.settlement_id exists.
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS settlement_id UUID;

-- Ensure payment workflow columns exist.
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;

-- Ensure settlement_batches table exists.
-- If your base schema already creates this table, this is harmless.
CREATE TABLE IF NOT EXISTS public.settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  coach_id UUID NOT NULL REFERENCES public.users(id),
  total_amount INTEGER NOT NULL DEFAULT 0,
  booking_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK: bookings.settlement_id -> settlement_batches.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_settlement_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_settlement_id_fkey
    FOREIGN KEY (settlement_id)
    REFERENCES public.settlement_batches(id);
  END IF;
END $$;

-- Speed up settlement detail, validation, cancellation unlink.
CREATE INDEX IF NOT EXISTS idx_bookings_settlement_id
ON public.bookings(settlement_id)
WHERE settlement_id IS NOT NULL;

-- Speed up monthly eligible booking lookup.
CREATE INDEX IF NOT EXISTS idx_bookings_unsettled_paid_completed
ON public.bookings (completed_at, coach_id)
WHERE (
  status = 'completed'
  AND payment_status = 'paid'
  AND paid_at IS NOT NULL
  AND settlement_id IS NULL
);

-- Prevent duplicate active settlement batches for the same coach/month.
-- Active means pending or paid. Cancelled batches do not block regeneration.
CREATE UNIQUE INDEX IF NOT EXISTS settlement_batches_unique_active_coach_month
ON public.settlement_batches (month, coach_id)
WHERE (status <> 'cancelled');

-- ============================================================
-- 2. Constraints
-- ============================================================

-- Settlement status enum guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settlement_batches_status_check'
  ) THEN
    ALTER TABLE public.settlement_batches
    ADD CONSTRAINT settlement_batches_status_check
    CHECK (status IN ('pending', 'paid', 'cancelled')) NOT VALID;
  END IF;
END $$;

-- Settlement month format guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settlement_batches_month_format_check'
  ) THEN
    ALTER TABLE public.settlement_batches
    ADD CONSTRAINT settlement_batches_month_format_check
    CHECK (month ~ '^\d{4}-\d{2}$') NOT VALID;
  END IF;
END $$;

-- Settlement non-negative money/count guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settlement_batches_non_negative_totals'
  ) THEN
    ALTER TABLE public.settlement_batches
    ADD CONSTRAINT settlement_batches_non_negative_totals
    CHECK (
      total_amount >= 0
      AND booking_count >= 0
    ) NOT VALID;
  END IF;
END $$;

-- paid_at consistency:
-- - paid batch must have paid_at
-- - pending/cancelled batch must not have paid_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settlement_batches_paid_at_consistency'
  ) THEN
    ALTER TABLE public.settlement_batches
    ADD CONSTRAINT settlement_batches_paid_at_consistency
    CHECK (
      (
        status = 'paid'
        AND paid_at IS NOT NULL
      )
      OR
      (
        status IN ('pending', 'cancelled')
        AND paid_at IS NULL
      )
    ) NOT VALID;
  END IF;
END $$;

-- Booking payment_status enum guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_payment_status_check'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'expired')) NOT VALID;
  END IF;
END $$;

-- Booking paid-state consistency guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_paid_state_consistency'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_paid_state_consistency
    CHECK (
      (
        payment_status = 'paid'
        AND paid_at IS NOT NULL
        AND status IN (
          'scheduled',
          'in_progress',
          'pending_completion',
          'completed',
          'disputed',
          'refunded'
        )
      )
      OR
      (
        payment_status <> 'paid'
        AND status NOT IN (
          'scheduled',
          'in_progress',
          'pending_completion',
          'completed'
        )
      )
    ) NOT VALID;
  END IF;
END $$;

-- ============================================================
-- 3. Payment confirmation ledger
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_reference TEXT NOT NULL UNIQUE,
  confirmed_by UUID NOT NULL REFERENCES public.users(id),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_confirmations_booking_id
ON public.payment_confirmations(booking_id);

CREATE INDEX IF NOT EXISTS idx_payment_confirmations_confirmed_by
ON public.payment_confirmations(confirmed_by);

-- ============================================================
-- 4. Settlement validation helper
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_settlement_batch(
  p_batch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.settlement_batches%ROWTYPE;
  v_actual_count INTEGER := 0;
  v_actual_total INTEGER := 0;
  v_invalid_count INTEGER := 0;
BEGIN
  SELECT *
  INTO v_batch
  FROM public.settlement_batches
  WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'batch_not_found'
    );
  END IF;

  SELECT
    COUNT(*),
    COALESCE(SUM(COALESCE(coach_payout, 0)), 0),
    COUNT(*) FILTER (
      WHERE status <> 'completed'
         OR payment_status <> 'paid'
         OR paid_at IS NULL
         OR coach_id <> v_batch.coach_id
         OR to_char(completed_at AT TIME ZONE 'UTC', 'YYYY-MM') <> v_batch.month
    )
  INTO
    v_actual_count,
    v_actual_total,
    v_invalid_count
  FROM public.bookings
  WHERE settlement_id = p_batch_id;

  RETURN jsonb_build_object(
    'ok',
      v_actual_count = v_batch.booking_count
      AND v_actual_total = v_batch.total_amount
      AND v_invalid_count = 0
      AND v_actual_count > 0,
    'batchId', p_batch_id,
    'expectedCount', v_batch.booking_count,
    'actualCount', v_actual_count,
    'expectedTotal', v_batch.total_amount,
    'actualTotal', v_actual_total,
    'invalidBookingCount', v_invalid_count
  );
END;
$$;

-- ============================================================
-- 5. Trigger: protect booking.settlement_id linkage
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_booking_settlement_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- INSERT: only validate NEW settlement_id.
  IF TG_OP = 'INSERT' THEN
    IF NEW.settlement_id IS NOT NULL THEN
      SELECT status
      INTO v_new_status
      FROM public.settlement_batches
      WHERE id = NEW.settlement_id;

      IF v_new_status IS NULL THEN
        RAISE EXCEPTION 'Settlement batch does not exist';
      END IF;

      IF v_new_status <> 'pending' THEN
        RAISE EXCEPTION 'Bookings can only be linked to pending settlement batches';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: prevent unlink/move from paid batch.
  IF OLD.settlement_id IS NOT NULL
     AND OLD.settlement_id IS DISTINCT FROM NEW.settlement_id THEN

    SELECT status
    INTO v_old_status
    FROM public.settlement_batches
    WHERE id = OLD.settlement_id;

    IF v_old_status = 'paid' THEN
      RAISE EXCEPTION 'Cannot unlink or move booking from a paid settlement batch';
    END IF;
  END IF;

  -- UPDATE: only allow linking to pending batch.
  IF NEW.settlement_id IS NOT NULL
     AND NEW.settlement_id IS DISTINCT FROM OLD.settlement_id THEN

    SELECT status
    INTO v_new_status
    FROM public.settlement_batches
    WHERE id = NEW.settlement_id;

    IF v_new_status IS NULL THEN
      RAISE EXCEPTION 'Settlement batch does not exist';
    END IF;

    IF v_new_status <> 'pending' THEN
      RAISE EXCEPTION 'Bookings can only be linked to pending settlement batches';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_booking_settlement_link ON public.bookings;

CREATE TRIGGER trg_guard_booking_settlement_link
BEFORE INSERT OR UPDATE OF settlement_id ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.guard_booking_settlement_link();

-- ============================================================
-- 6. Trigger: protect settlement batch status transitions
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_settlement_batch_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_validation JSONB;
  v_linked_count INTEGER := 0;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'paid' THEN
    IF NEW.status <> 'paid' THEN
      RAISE EXCEPTION 'Paid settlement batch cannot change status';
    END IF;

    IF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
      RAISE EXCEPTION 'Paid settlement batch total_amount is immutable';
    END IF;

    IF OLD.booking_count IS DISTINCT FROM NEW.booking_count THEN
      RAISE EXCEPTION 'Paid settlement batch booking_count is immutable';
    END IF;

    IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
      RAISE EXCEPTION 'Paid settlement batch paid_at is immutable';
    END IF;
  END IF;

  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled settlement batch cannot be restored';
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
    v_validation := public.validate_settlement_batch(NEW.id);

    IF COALESCE((v_validation ->> 'ok')::BOOLEAN, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Settlement batch validation failed before marking paid: %', v_validation::TEXT;
    END IF;

    IF NEW.paid_at IS NULL THEN
      RAISE EXCEPTION 'Paid settlement batch must have paid_at';
    END IF;
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
    SELECT COUNT(*)
    INTO v_linked_count
    FROM public.bookings
    WHERE settlement_id = NEW.id;

    IF v_linked_count > 0 THEN
      RAISE EXCEPTION 'Cannot cancel settlement batch while bookings are still linked';
    END IF;

    IF NEW.paid_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cancelled settlement batch must not have paid_at';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_settlement_batch_status_transition ON public.settlement_batches;

CREATE TRIGGER trg_guard_settlement_batch_status_transition
BEFORE UPDATE OF status, paid_at, total_amount, booking_count ON public.settlement_batches
FOR EACH ROW
EXECUTE FUNCTION public.guard_settlement_batch_status_transition();

-- ============================================================
-- 7. RPC: confirm_booking_payment
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_booking_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 404,
      'error', '找不到此預約'
    );
  END IF;

  IF v_booking.status <> 'pending_payment' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 400,
      'error', '只有待付款預約可以確認付款'
    );
  END IF;

  IF v_booking.payment_reference IS NULL
     OR btrim(v_booking.payment_reference) = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 400,
      'error', '請先確認學員已提交付款回報'
    );
  END IF;

  IF v_booking.payment_expires_at IS NOT NULL
     AND now() > v_booking.payment_expires_at THEN

    UPDATE public.bookings
    SET status = 'cancelled',
        payment_status = 'expired',
        payment_expires_at = NULL
    WHERE id = p_booking_id;

    INSERT INTO public.audit_logs(
      actor_id,
      actor_role,
      action,
      target_id,
      details
    )
    VALUES (
      p_actor_id,
      'admin',
      'EXPIRE_PENDING_PAYMENT_ON_CONFIRM_ATTEMPT',
      p_booking_id::TEXT,
      'Payment confirmation attempted after expiration'
    );

    RETURN jsonb_build_object(
      'ok', false,
      'status', 409,
      'error', '付款保留時間已過期，請重新建立預約'
    );
  END IF;

  BEGIN
    INSERT INTO public.payment_confirmations(
      booking_id,
      payment_reference,
      confirmed_by,
      confirmed_at
    )
    VALUES (
      p_booking_id,
      v_booking.payment_reference,
      p_actor_id,
      now()
    );
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'ok', false,
        'status', 409,
        'error', '此付款憑證已被確認過，請檢查是否重複付款或重複上傳'
      );
  END;

  UPDATE public.bookings
  SET status = 'scheduled',
      payment_status = 'paid',
      paid_at = now(),
      payment_expires_at = NULL
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs(
    actor_id,
    actor_role,
    action,
    target_id,
    details
  )
  VALUES (
    p_actor_id,
    'admin',
    'CONFIRM_BOOKING_PAYMENT',
    p_booking_id::TEXT,
    'Confirmed pending_payment booking as scheduled and marked payment paid'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'status', 200,
    'newStatus', 'scheduled'
  );
END;
$$;

-- ============================================================
-- 8. RPC: generate_settlement_batches
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_settlement_batches(
  p_month TEXT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_month_number INTEGER;
  v_month_start TIMESTAMPTZ;
  v_month_end TIMESTAMPTZ;
  v_group RECORD;
  v_batch_id UUID;
  v_linked_count INTEGER := 0;
  v_total_amount INTEGER := 0;
  v_created JSONB := '[]'::JSONB;
  v_skipped JSONB := '[]'::JSONB;
BEGIN
  IF p_month IS NULL OR p_month !~ '^\d{4}-\d{2}$' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 400,
      'error', '請提供正確的月份格式 (YYYY-MM)'
    );
  END IF;

  v_year := substring(p_month from 1 for 4)::INTEGER;
  v_month_number := substring(p_month from 6 for 2)::INTEGER;

  IF v_month_number < 1 OR v_month_number > 12 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 400,
      'error', '請提供正確的月份格式 (YYYY-MM)'
    );
  END IF;

  v_month_start := make_timestamptz(v_year, v_month_number, 1, 0, 0, 0, 'UTC');
  v_month_end := v_month_start + INTERVAL '1 month';

  PERFORM pg_advisory_xact_lock(hashtext('settlement:' || p_month));

  FOR v_group IN
    SELECT coach_id
    FROM public.bookings
    WHERE status = 'completed'
      AND payment_status = 'paid'
      AND paid_at IS NOT NULL
      AND settlement_id IS NULL
      AND completed_at >= v_month_start
      AND completed_at < v_month_end
      AND coach_id IS NOT NULL
      AND COALESCE(coach_payout, 0) > 0
    GROUP BY coach_id
    ORDER BY coach_id
  LOOP
    PERFORM pg_advisory_xact_lock(
      hashtext('settlement:' || p_month || ':' || v_group.coach_id::TEXT)
    );

    v_batch_id := NULL;
    v_linked_count := 0;
    v_total_amount := 0;

    INSERT INTO public.settlement_batches (
      month,
      coach_id,
      total_amount,
      booking_count,
      status,
      paid_at
    )
    VALUES (
      p_month,
      v_group.coach_id,
      0,
      0,
      'pending',
      NULL
    )
    ON CONFLICT (month, coach_id)
      WHERE (status <> 'cancelled')
      DO NOTHING
    RETURNING id
    INTO v_batch_id;

    IF v_batch_id IS NULL THEN
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'coachId', v_group.coach_id,
          'reason', 'duplicate_active_batch'
        )
      );
      CONTINUE;
    END IF;

    WITH locked_bookings AS (
      SELECT id
      FROM public.bookings
      WHERE coach_id = v_group.coach_id
        AND status = 'completed'
        AND payment_status = 'paid'
        AND paid_at IS NOT NULL
        AND settlement_id IS NULL
        AND completed_at >= v_month_start
        AND completed_at < v_month_end
        AND COALESCE(coach_payout, 0) > 0
      ORDER BY completed_at, id
      FOR UPDATE
    ),
    updated AS (
      UPDATE public.bookings b
      SET settlement_id = v_batch_id
      FROM locked_bookings lb
      WHERE b.id = lb.id
      RETURNING b.id, b.coach_payout
    )
    SELECT
      COUNT(*),
      COALESCE(SUM(COALESCE(coach_payout, 0)), 0)
    INTO
      v_linked_count,
      v_total_amount
    FROM updated;

    IF v_linked_count = 0 THEN
      UPDATE public.settlement_batches
      SET status = 'cancelled',
          paid_at = NULL
      WHERE id = v_batch_id
        AND status = 'pending';

      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'coachId', v_group.coach_id,
          'reason', 'no_linked_bookings'
        )
      );

      CONTINUE;
    END IF;

    UPDATE public.settlement_batches
    SET total_amount = v_total_amount,
        booking_count = v_linked_count
    WHERE id = v_batch_id
      AND status = 'pending';

    v_created := v_created || jsonb_build_array(
      jsonb_build_object(
        'id', v_batch_id,
        'coachId', v_group.coach_id,
        'month', p_month,
        'totalAmount', v_total_amount,
        'bookingCount', v_linked_count,
        'status', 'pending'
      )
    );
  END LOOP;

  INSERT INTO public.audit_logs(
    actor_id,
    actor_role,
    action,
    target_id,
    details
  )
  VALUES (
    p_actor_id,
    'admin',
    'GENERATE_SETTLEMENT_BATCHES',
    p_month,
    jsonb_build_object(
      'createdCount', jsonb_array_length(v_created),
      'created', v_created,
      'skipped', v_skipped
    )::TEXT
  );

  RETURN jsonb_build_object(
    'ok', true,
    'status', 200,
    'createdCount', jsonb_array_length(v_created),
    'batches', v_created,
    'skippedCoaches', v_skipped
  );
END;
$$;

-- ============================================================
-- 9. RPC: mark_settlement_status
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_settlement_status(
  p_batch_id UUID,
  p_next_status TEXT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.settlement_batches%ROWTYPE;
  v_validation JSONB;
BEGIN
  IF p_next_status NOT IN ('pending', 'paid', 'cancelled') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 400,
      'error', '無效的狀態值'
    );
  END IF;

  SELECT *
  INTO v_batch
  FROM public.settlement_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 404,
      'error', '找不到該結算批次'
    );
  END IF;

  IF v_batch.status = 'paid' AND p_next_status = 'paid' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 200,
      'batchStatus', 'paid',
      'paidAt', v_batch.paid_at,
      'idempotent', true
    );
  END IF;

  IF v_batch.status = 'paid' AND p_next_status <> 'paid' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 400,
      'error', '已撥款批次不可改回其他狀態'
    );
  END IF;

  IF v_batch.status = 'cancelled' AND p_next_status <> 'cancelled' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 400,
      'error', '已取消批次不可恢復或撥款，請重新產生結算批次'
    );
  END IF;

  IF p_next_status = 'pending' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 400,
      'error', '不支援將批次改回 pending'
    );
  END IF;

  IF p_next_status = 'paid' THEN
    PERFORM 1
    FROM public.bookings
    WHERE settlement_id = p_batch_id
    FOR UPDATE;

    v_validation := public.validate_settlement_batch(p_batch_id);

    IF COALESCE((v_validation ->> 'ok')::BOOLEAN, false) IS NOT TRUE THEN
      RETURN jsonb_build_object(
        'ok', false,
        'status', 409,
        'error', '批次金額或筆數與訂單明細不一致，禁止撥款',
        'validation', v_validation
      );
    END IF;

    UPDATE public.settlement_batches
    SET status = 'paid',
        paid_at = now()
    WHERE id = p_batch_id
      AND status = 'pending';

  ELSIF p_next_status = 'cancelled' THEN
    UPDATE public.bookings
    SET settlement_id = NULL
    WHERE settlement_id = p_batch_id;

    UPDATE public.settlement_batches
    SET status = 'cancelled',
        paid_at = NULL
    WHERE id = p_batch_id
      AND status = 'pending';
  END IF;

  INSERT INTO public.audit_logs(
    actor_id,
    actor_role,
    action,
    target_id,
    details
  )
  VALUES (
    p_actor_id,
    'admin',
    'UPDATE_SETTLEMENT_STATUS',
    p_batch_id::TEXT,
    jsonb_build_object(
      'from', v_batch.status,
      'to', p_next_status
    )::TEXT
  );

  RETURN jsonb_build_object(
    'ok', true,
    'status', 200,
    'batchStatus', p_next_status
  );
END;
$$;

-- ============================================================
-- 10. Permissions
-- ============================================================

REVOKE ALL ON FUNCTION public.validate_settlement_batch(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_booking_payment(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_settlement_batches(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_settlement_status(UUID, TEXT, UUID) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.validate_settlement_batch(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_booking_payment(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.generate_settlement_batches(TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.mark_settlement_status(UUID, TEXT, UUID) FROM anon;

REVOKE ALL ON FUNCTION public.validate_settlement_batch(UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.confirm_booking_payment(UUID, UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.generate_settlement_batches(TEXT, UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.mark_settlement_status(UUID, TEXT, UUID) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.validate_settlement_batch(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_settlement_batches(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_settlement_status(UUID, TEXT, UUID) TO service_role;

-- ============================================================
-- 11. Security Definer Fallback: revoke authenticated access
-- ============================================================
REVOKE ALL ON FUNCTION public.create_booking_safe(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_booking_safe(UUID, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.create_booking_safe(UUID, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_safe(UUID, TEXT, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.complete_booking_with_referral(UUID, UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_booking_with_referral(UUID, UUID, TEXT, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.complete_booking_with_referral(UUID, UUID, TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booking_with_referral(UUID, UUID, TEXT, INTEGER) TO service_role;

-- ============================================================
-- 12. Settlement Batches NOT NULL + Backfill
-- ============================================================
UPDATE public.settlement_batches
SET total_amount = 0
WHERE total_amount IS NULL;

UPDATE public.settlement_batches
SET booking_count = 0
WHERE booking_count IS NULL;

UPDATE public.settlement_batches
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE public.settlement_batches
ALTER COLUMN total_amount SET DEFAULT 0,
ALTER COLUMN total_amount SET NOT NULL,
ALTER COLUMN booking_count SET DEFAULT 0,
ALTER COLUMN booking_count SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'pending',
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN month SET NOT NULL,
ALTER COLUMN coach_id SET NOT NULL,
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN created_at SET NOT NULL;

-- ============================================================
-- 13. Reload PostgREST Schema Cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
