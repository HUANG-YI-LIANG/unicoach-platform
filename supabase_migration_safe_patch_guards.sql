-- Safe Patch Guards: atomic reward release, video stat increments, and review uniqueness.
-- Apply this migration in Supabase before relying on the paired API changes in production.

CREATE OR REPLACE FUNCTION public.release_referral_reward(p_log_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount INTEGER;
BEGIN
  UPDATE reward_logs
  SET status = 'released', released_at = now()
  WHERE id = p_log_id AND status = 'pending'
  RETURNING referrer_user_id, reward_amount INTO v_user_id, v_amount;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE users
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_amount
  WHERE id = v_user_id;

  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description)
  VALUES (v_user_id, v_amount, 'referral_bonus', '推薦獎勵解鎖');

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_video_stats(
  p_video_id UUID,
  p_field TEXT,
  p_increment INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new INTEGER;
BEGIN
  IF p_field = 'view' THEN
    UPDATE coach_videos
    SET view_count = COALESCE(view_count, 0) + p_increment
    WHERE id = p_video_id
    RETURNING view_count INTO v_new;
  ELSIF p_field = 'share' THEN
    UPDATE coach_videos
    SET share_count = COALESCE(share_count, 0) + p_increment
    WHERE id = p_video_id
    RETURNING share_count INTO v_new;
  ELSIF p_field = 'like' THEN
    UPDATE coach_videos
    SET like_count = GREATEST(0, COALESCE(like_count, 0) + p_increment)
    WHERE id = p_video_id
    RETURNING like_count INTO v_new;
  ELSE
    RAISE EXCEPTION 'Unsupported video stats field: %', p_field;
  END IF;

  RETURN v_new;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_booking_id_unique'
      AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_booking_id_unique UNIQUE (booking_id);
  END IF;
END;
$$;
