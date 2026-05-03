-- Stage 2 booking transaction guards
-- Purpose: add database-level protection against concurrent duplicate/overlapping coach bookings.
-- Run after supabase_migration_bookings_fix.sql so duration_minutes exists.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

UPDATE bookings
SET duration_minutes = 60
WHERE duration_minutes IS NULL OR duration_minutes <= 0;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_duration_positive;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_duration_positive
  CHECK (duration_minutes > 0);

-- Fast exact duplicate guard for the most common race condition.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_coach_expected_time_uidx
  ON bookings (coach_id, expected_time)
  WHERE status IN ('pending_payment', 'scheduled', 'in_progress', 'pending_completion');

-- Strong overlap guard for different plans/durations on the same coach.
-- If this fails during migration, existing overlapping rows must be resolved first.
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_no_active_time_overlap;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_active_time_overlap
  EXCLUDE USING gist (
    coach_id WITH =,
    tstzrange(
      expected_time,
      expected_time + (duration_minutes * interval '1 minute'),
      '[)'
    ) WITH &&
  )
  WHERE (status IN ('pending_payment', 'scheduled', 'in_progress', 'pending_completion'));

NOTIFY pgrst, 'reload schema';
