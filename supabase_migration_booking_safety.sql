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
