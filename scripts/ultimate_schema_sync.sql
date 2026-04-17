-- UniCoach Ultimate Schema Synchronization Patch (Final v5.1)
-- Purpose: Consolidates all missing audit and compliance columns identified by API Probe.

-- 1. Upgrade Users Table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- 2. Upgrade Terms Consents Table
-- This table tracks all legal agreements and minor protection consents.
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

-- 3. Optimize Schema Cache
ANALYZE users;
ANALYZE terms_consents;

-- SUCCESS: Database is now fully synchronized with hardened Registration API v2.0
