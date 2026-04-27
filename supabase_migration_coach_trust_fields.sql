-- Add new columns for coach profile to improve trust and clarity for parents
ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS teaching_features text,
ADD COLUMN IF NOT EXISTS communication_style text,
ADD COLUMN IF NOT EXISTS policy_rules text,
ADD COLUMN IF NOT EXISTS trust_badges jsonb DEFAULT '[]'::jsonb;
