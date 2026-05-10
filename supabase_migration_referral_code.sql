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
