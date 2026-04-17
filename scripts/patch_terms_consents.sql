-- SQL Patch: Upgrade terms_consents Table
-- Purpose: Support full legal compliance logging from Phase 2/3 Registration API

ALTER TABLE terms_consents 
ADD COLUMN IF NOT EXISTS consent_type TEXT DEFAULT 'registration',
ADD COLUMN IF NOT EXISTS privacy_version TEXT,
ADD COLUMN IF NOT EXISTS disclaimer_version TEXT,
ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS accepted_privacy BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS accepted_disclaimer BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guardian_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Verify after execution
-- SELECT * FROM terms_consents LIMIT 1;
