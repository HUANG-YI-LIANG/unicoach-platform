-- Stage 4 schema consistency guards for API-required tables, columns, and invariants.
-- Run after the base schema and previous migrations.
-- Uses IF NOT EXISTS / guarded DO blocks so it is safe to re-run.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS price_adjustment INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.learning_reports
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_non_negative_money'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_non_negative_money
    CHECK (
      base_price >= 0
      AND discount_amount >= 0
      AND final_price >= 0
      AND deposit_paid >= 0
      AND platform_fee >= 0
      AND coach_payout >= 0
      AND COALESCE(price_adjustment, 0) >= 0
      AND COALESCE(coupon_discount, 0) >= 0
    ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_paid_state_consistency'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_paid_state_consistency
    CHECK (
      (
        payment_status = 'paid'
        AND paid_at IS NOT NULL
        AND status IN ('scheduled', 'in_progress', 'pending_completion', 'completed', 'disputed', 'refunded')
      )
      OR (
        payment_status <> 'paid'
        AND status NOT IN ('scheduled', 'in_progress', 'pending_completion', 'completed')
      )
    ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
ON public.password_reset_tokens(token);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
ON public.password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_learning_reports_user_id
ON public.learning_reports(user_id);
