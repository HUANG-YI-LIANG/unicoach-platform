-- supabase_migration_referral_code.sql
-- Coach referral code hardening migration
-- Purpose:
-- 1) Store coach referral codes as immutable DB-owned values.
-- 2) Backfill existing coaches with unique 8-character uppercase alphanumeric codes.
-- 3) Prevent future accidental changes caused by mutable names/profile edits.
--
-- Deployment note:
-- This migration is safe for fresh installs and for partially prepared environments where
-- public.coaches.referral_code already exists but still contains NULL, empty, or whitespace values.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

CREATE OR REPLACE FUNCTION public.generate_coach_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
BEGIN
  LOOP
    -- 8 chars, uppercase alphanumeric subset via UUID hex. This satisfies the 6~8 code requirement.
    v_code := SUBSTRING(REPLACE(UPPER(gen_random_uuid()::TEXT), '-', '') FROM 1 FOR 8);

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.coaches
      WHERE referral_code = v_code
    );
  END LOOP;

  RETURN v_code;
END;
$$;

-- If an older version of this trigger exists, remove it before cleanup/backfill.
-- Otherwise whitespace-only legacy values could be treated as immutable and block this migration.
DROP TRIGGER IF EXISTS coaches_set_referral_code ON public.coaches;
DROP FUNCTION IF EXISTS public.set_coach_referral_code();

-- Normalize existing non-empty codes before constraints are attached.
UPDATE public.coaches
SET referral_code = UPPER(BTRIM(referral_code))
WHERE referral_code IS NOT NULL
  AND BTRIM(referral_code) <> '';

-- Backfill NULL, empty, and whitespace-only legacy coaches before enabling immutability.
-- The generator checks existing values each loop.
UPDATE public.coaches
SET referral_code = public.generate_coach_referral_code()
WHERE referral_code IS NULL OR BTRIM(referral_code) = '';

CREATE OR REPLACE FUNCTION public.protect_coach_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.referral_code IS NULL OR BTRIM(NEW.referral_code) = '' THEN
      NEW.referral_code := public.generate_coach_referral_code();
    ELSE
      NEW.referral_code := UPPER(BTRIM(NEW.referral_code));
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Treat NULL, empty, and whitespace-only OLD values as unassigned.
    -- Only non-empty existing codes are immutable.
    IF NULLIF(BTRIM(OLD.referral_code), '') IS NOT NULL
      AND NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
      RAISE EXCEPTION 'coach referral_code is immutable once assigned';
    END IF;

    IF NULLIF(BTRIM(OLD.referral_code), '') IS NULL THEN
      IF NEW.referral_code IS NULL OR BTRIM(NEW.referral_code) = '' THEN
        NEW.referral_code := public.generate_coach_referral_code();
      ELSE
        NEW.referral_code := UPPER(BTRIM(NEW.referral_code));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER coaches_set_referral_code
BEFORE INSERT OR UPDATE ON public.coaches
FOR EACH ROW
EXECUTE FUNCTION public.protect_coach_referral_code();

ALTER TABLE public.coaches
  ALTER COLUMN referral_code SET NOT NULL;

ALTER TABLE public.coaches
  DROP CONSTRAINT IF EXISTS coaches_referral_code_format;
ALTER TABLE public.coaches
  ADD CONSTRAINT coaches_referral_code_format
  CHECK (
    referral_code = UPPER(referral_code)
    AND referral_code ~ '^[A-Z0-9]{6,8}$'
    AND char_length(referral_code) BETWEEN 6 AND 8
  );

CREATE UNIQUE INDEX IF NOT EXISTS coaches_referral_code_unique_idx
  ON public.coaches(referral_code);

NOTIFY pgrst, 'reload schema';


-- supabase_migration_booking_safety.sql
-- Booking safety hardening migration
-- Purpose:
-- 1) Create coupon_redemptions with UNIQUE(user_id, coupon_id) for server-side coupon redemption.
-- 2) Create create_booking_safe RPC that uses pg_advisory_xact_lock plus an in-transaction
--    overlap check before inserting bookings, preventing concurrent double booking.
--
-- Run after the booking workflow/payment migrations that add duration_minutes and payment_expires_at.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendees_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS coupon_id TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_title TEXT,
  ADD COLUMN IF NOT EXISTS plan_snapshot TEXT;

UPDATE public.bookings
SET duration_minutes = 60
WHERE duration_minutes IS NULL OR duration_minutes <= 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_duration_positive'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_duration_positive
      CHECK (duration_minutes > 0) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coupon_id TEXT NOT NULL,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, coupon_id)
);

CREATE INDEX IF NOT EXISTS coupon_redemptions_booking_id_idx
  ON public.coupon_redemptions(booking_id);

CREATE OR REPLACE FUNCTION public.create_booking_safe(
  p_user_id UUID,
  p_coupon_id TEXT DEFAULT NULL,
  p_bookings JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking JSONB;
  v_booking_ids UUID[] := ARRAY[]::UUID[];
  v_first_booking_id UUID;
  v_coach_id UUID;
  v_expected_time TIMESTAMPTZ;
  v_duration_minutes INTEGER;
  v_status TEXT;
  v_coupon_id TEXT;
  v_lock_key BIGINT;
  v_has_overlap BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'missing_user_id' USING ERRCODE = '22023';
  END IF;

  IF p_bookings IS NULL OR jsonb_typeof(p_bookings) <> 'array' OR jsonb_array_length(p_bookings) = 0 THEN
    RAISE EXCEPTION 'missing_booking_rows' USING ERRCODE = '22023';
  END IF;

  -- Validate every row and take deterministic transaction-scoped locks before conflict checks.
  -- Lock scope is coach + Taipei calendar date so overlapping nearby start times on the same day
  -- cannot pass concurrent app-layer checks before either transaction commits.
  FOR v_booking IN
    SELECT value
    FROM jsonb_array_elements(p_bookings) AS item(value)
    ORDER BY value->>'coach_id', value->>'expected_time'
  LOOP
    v_coach_id := NULLIF(v_booking->>'coach_id', '')::UUID;
    v_expected_time := NULLIF(v_booking->>'expected_time', '')::TIMESTAMPTZ;
    v_duration_minutes := COALESCE(NULLIF(v_booking->>'duration_minutes', '')::INTEGER, 60);
    v_status := COALESCE(NULLIF(v_booking->>'status', ''), 'pending_payment');
    v_coupon_id := NULLIF(v_booking->>'coupon_id', '');

    IF NULLIF(v_booking->>'user_id', '')::UUID IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'booking_user_mismatch' USING ERRCODE = '22023';
    END IF;

    IF v_coach_id IS NULL OR v_expected_time IS NULL OR v_duration_minutes <= 0 THEN
      RAISE EXCEPTION 'invalid_booking_time_or_duration' USING ERRCODE = '22023';
    END IF;

    IF v_status <> 'pending_payment' THEN
      RAISE EXCEPTION 'booking_safe_only_accepts_pending_payment' USING ERRCODE = '22023';
    END IF;

    IF p_coupon_id IS NULL AND v_coupon_id IS NOT NULL THEN
      RAISE EXCEPTION 'coupon_id_mismatch' USING ERRCODE = '22023';
    END IF;

    IF p_coupon_id IS NOT NULL AND v_coupon_id IS DISTINCT FROM p_coupon_id THEN
      RAISE EXCEPTION 'coupon_id_mismatch' USING ERRCODE = '22023';
    END IF;

    v_lock_key := hashtextextended(
      'booking:coach-day:' || v_coach_id::TEXT || ':' || ((v_expected_time AT TIME ZONE 'Asia/Taipei')::DATE)::TEXT,
      0
    );
    PERFORM pg_advisory_xact_lock(v_lock_key);
  END LOOP;

  -- Re-check conflicts inside the same transaction after locks are held.
  FOR v_booking IN
    SELECT value
    FROM jsonb_array_elements(p_bookings) AS item(value)
    ORDER BY value->>'coach_id', value->>'expected_time'
  LOOP
    v_coach_id := NULLIF(v_booking->>'coach_id', '')::UUID;
    v_expected_time := NULLIF(v_booking->>'expected_time', '')::TIMESTAMPTZ;
    v_duration_minutes := COALESCE(NULLIF(v_booking->>'duration_minutes', '')::INTEGER, 60);

    SELECT EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.coach_id = v_coach_id
        AND b.status IN ('pending_payment', 'scheduled', 'in_progress', 'pending_completion')
        AND NOT (
          b.status = 'pending_payment'
          AND b.payment_expires_at IS NOT NULL
          AND b.payment_expires_at <= now()
        )
        AND tstzrange(
          b.expected_time,
          b.expected_time + (COALESCE(NULLIF(b.duration_minutes, 0), 60) * INTERVAL '1 minute'),
          '[)'
        ) && tstzrange(
          v_expected_time,
          v_expected_time + (v_duration_minutes * INTERVAL '1 minute'),
          '[)'
        )
      LIMIT 1
    ) INTO v_has_overlap;

    IF v_has_overlap THEN
      RAISE EXCEPTION 'booking_time_conflict' USING ERRCODE = '23P01';
    END IF;
  END LOOP;

  WITH inserted AS (
    INSERT INTO public.bookings (
      id,
      user_id,
      coach_id,
      expected_time,
      base_price,
      discount_amount,
      final_price,
      deposit_paid,
      platform_fee,
      coach_payout,
      grade,
      gender,
      attendees_count,
      learning_status,
      coupon_id,
      coupon_discount,
      status,
      series_id,
      recurrence_pattern,
      session_number,
      duration_minutes,
      payment_expires_at,
      plan_id,
      plan_title,
      plan_snapshot
    )
    SELECT
      COALESCE(NULLIF(row_data->>'id', '')::UUID, gen_random_uuid()),
      p_user_id,
      (row_data->>'coach_id')::UUID,
      (row_data->>'expected_time')::TIMESTAMPTZ,
      COALESCE((row_data->>'base_price')::INTEGER, 0),
      COALESCE((row_data->>'discount_amount')::INTEGER, 0),
      COALESCE((row_data->>'final_price')::INTEGER, 0),
      COALESCE((row_data->>'deposit_paid')::INTEGER, 0),
      COALESCE((row_data->>'platform_fee')::INTEGER, 0),
      COALESCE((row_data->>'coach_payout')::INTEGER, 0),
      NULLIF(row_data->>'grade', ''),
      NULLIF(row_data->>'gender', ''),
      COALESCE((row_data->>'attendees_count')::INTEGER, 1),
      NULLIF(row_data->>'learning_status', ''),
      NULLIF(row_data->>'coupon_id', ''),
      COALESCE((row_data->>'coupon_discount')::INTEGER, 0),
      COALESCE(NULLIF(row_data->>'status', ''), 'pending_payment'),
      NULLIF(row_data->>'series_id', ''),
      NULLIF(row_data->>'recurrence_pattern', ''),
      NULLIF(row_data->>'session_number', '')::INTEGER,
      COALESCE(NULLIF(row_data->>'duration_minutes', '')::INTEGER, 60),
      NULLIF(row_data->>'payment_expires_at', '')::TIMESTAMPTZ,
      NULLIF(row_data->>'plan_id', ''),
      NULLIF(row_data->>'plan_title', ''),
      NULLIF(row_data->>'plan_snapshot', '')
    FROM jsonb_array_elements(p_bookings) AS rows(row_data)
    RETURNING id
  )
  SELECT array_agg(id ORDER BY id) INTO v_booking_ids
  FROM inserted;

  IF v_booking_ids IS NULL OR array_length(v_booking_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'booking_insert_failed' USING ERRCODE = 'P0001';
  END IF;

  v_first_booking_id := COALESCE(NULLIF((p_bookings->0)->>'id', '')::UUID, v_booking_ids[1]);

  IF p_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_redemptions (user_id, coupon_id, booking_id)
    VALUES (p_user_id, p_coupon_id, v_first_booking_id);
  END IF;

  RETURN jsonb_build_object(
    'booking_ids', to_jsonb(v_booking_ids),
    'bookings', (
      SELECT jsonb_agg(jsonb_build_object('id', booking_id))
      FROM unnest(v_booking_ids) AS booking_id
    ),
    'coupon_redeemed', p_coupon_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_safe(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_safe(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_safe(UUID, TEXT, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';


-- supabase_migration_booking_completion.sql
-- Booking completion hardening migration
-- Purpose:
-- 1) Make booking completion and referral reward issuance atomic.
-- 2) Prevent duplicate referral rewards with UNIQUE(order_id, reward_type).
-- 3) Re-validate paid state, class end time, and formal learning report inside the database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_completed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.reward_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  recipient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'granted',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, reward_type)
);

CREATE INDEX IF NOT EXISTS reward_logs_recipient_user_id_idx
  ON public.reward_logs(recipient_user_id);

CREATE INDEX IF NOT EXISTS reward_logs_referred_user_id_idx
  ON public.reward_logs(referred_user_id);

CREATE OR REPLACE FUNCTION public.complete_booking_with_referral(
  p_booking_id UUID,
  p_actor_id UUID,
  p_previous_status TEXT DEFAULT NULL,
  p_referral_reward_amount INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_has_report BOOLEAN;
  v_class_end TIMESTAMPTZ;
  v_referrer_id UUID;
  v_reward_amount INTEGER := 0;
  v_reward_rows INTEGER := 0;
  v_reward_inserted BOOLEAN := FALSE;
BEGIN
  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'missing_booking_id' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_previous_status IS NOT NULL AND v_booking.status IS DISTINCT FROM p_previous_status THEN
    RAISE EXCEPTION 'booking_completion_conflict' USING ERRCODE = 'P0001';
  END IF;

  IF v_booking.status = 'completed' THEN
    RETURN jsonb_build_object(
      'booking_id', p_booking_id,
      'status', 'completed',
      'already_completed', TRUE,
      'reward_inserted', FALSE
    );
  END IF;

  IF v_booking.status NOT IN ('pending_completion', 'in_progress') THEN
    RAISE EXCEPTION 'invalid_completion_transition' USING ERRCODE = '22023';
  END IF;

  IF v_booking.payment_status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'booking_not_paid' USING ERRCODE = '22023';
  END IF;

  v_class_end := v_booking.expected_time + (COALESCE(NULLIF(v_booking.duration_minutes, 0), 60) * INTERVAL '1 minute');
  IF now() < v_class_end THEN
    RAISE EXCEPTION 'booking_not_ended' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.learning_reports lr
    WHERE lr.booking_id = p_booking_id
      AND lr.completed_items IS NOT NULL
      AND lr.completed_items <> '__AI_DRAFT__'
  ) INTO v_has_report;

  IF NOT v_has_report THEN
    RAISE EXCEPTION 'missing_final_learning_report' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET status = 'completed',
      completed_at = COALESCE(completed_at, now())
  WHERE id = p_booking_id
    AND status = v_booking.status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_completion_conflict' USING ERRCODE = 'P0001';
  END IF;

  SELECT u.referred_by
  INTO v_referrer_id
  FROM public.users u
  WHERE u.id = v_booking.user_id
  FOR UPDATE;

  IF v_referrer_id IS NOT NULL THEN
    BEGIN
      SELECT COALESCE(NULLIF(value, '')::INTEGER, 0)
      INTO v_reward_amount
      FROM public.platform_settings
      WHERE key = 'referral_reward_amount';
    EXCEPTION WHEN invalid_text_representation THEN
      v_reward_amount := 0;
    END;

    v_reward_amount := COALESCE(p_referral_reward_amount, v_reward_amount, 0);
    IF v_reward_amount < 0 THEN
      v_reward_amount := 0;
    END IF;

    INSERT INTO public.reward_logs (
      order_id,
      reward_type,
      recipient_user_id,
      referred_user_id,
      amount,
      metadata
    )
    VALUES (
      p_booking_id,
      'referral_completion',
      v_referrer_id,
      v_booking.user_id,
      v_reward_amount,
      jsonb_build_object('actor_id', p_actor_id, 'booking_id', p_booking_id)
    )
    ON CONFLICT (order_id, reward_type) DO NOTHING;

    GET DIAGNOSTICS v_reward_rows = ROW_COUNT;
    v_reward_inserted := v_reward_rows > 0;

    IF v_reward_inserted AND v_reward_amount > 0 THEN
      UPDATE public.users
      SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward_amount
      WHERE id = v_referrer_id;

      INSERT INTO public.wallet_transactions (
        user_id,
        amount,
        transaction_type,
        reference_id,
        description
      )
      VALUES (
        v_referrer_id,
        v_reward_amount,
        'referral_reward',
        p_booking_id,
        '推薦學生完成首堂課獎勵'
      );
    END IF;

    UPDATE public.users
    SET referral_completed = TRUE
    WHERE id = v_booking.user_id;
  END IF;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'status', 'completed',
    'referrer_id', v_referrer_id,
    'reward_inserted', v_reward_inserted,
    'reward_amount', v_reward_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_booking_with_referral(UUID, UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_booking_with_referral(UUID, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booking_with_referral(UUID, UUID, TEXT, INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';


-- supabase_migration_cancel_fault.sql
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


