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
