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

-- Validate a settlement batch against its linked booking details before paid transition.
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
    RETURN jsonb_build_object('ok', false, 'reason', 'batch_not_found');
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
  INTO v_actual_count, v_actual_total, v_invalid_count
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

-- Paid settlement batches are financial ledgers: once paid, amount/count/status/paid_at are immutable.
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
