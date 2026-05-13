-- supabase_migration_reviews_unique.sql
-- Purpose: Prevent double-submit race condition in the review system by enforcing UNIQUE(booking_id).

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_booking_id_unique'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_booking_id_unique UNIQUE(booking_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
