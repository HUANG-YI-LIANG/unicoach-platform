-- Push Notifications v1 hardening migration
-- Purpose:
-- 1. Extend push_subscriptions for device lifecycle and failure tracking
-- 2. Add notification_delivery_logs for Web Push delivery audit
-- 3. Add notification_reads for per-user read state of global notifications
-- 4. Keep RLS strict: users can only access their own records; service_role can manage delivery

BEGIN;

-- =========================================================
-- 1. Ensure push_subscriptions exists
-- =========================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

-- =========================================================
-- 2. Extend push_subscriptions
-- =========================================================

ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS device_label TEXT,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;

-- Backfill last_seen_at for existing rows
UPDATE public.push_subscriptions
SET last_seen_at = COALESCE(last_seen_at, updated_at, created_at, now())
WHERE last_seen_at IS NULL;

-- Defensive constraints
ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_not_empty;

ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_endpoint_not_empty
CHECK (length(trim(endpoint)) > 0);

ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS push_subscriptions_p256dh_not_empty;

ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_p256dh_not_empty
CHECK (length(trim(p256dh)) > 0);

ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS push_subscriptions_auth_not_empty;

ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_auth_not_empty
CHECK (length(trim(auth)) > 0);

ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS push_subscriptions_failure_count_non_negative;

ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_failure_count_non_negative
CHECK (failure_count >= 0);

-- =========================================================
-- 3. Indexes for push_subscriptions
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active_user
ON public.push_subscriptions(user_id)
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_seen_at
ON public.push_subscriptions(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_revoked_at
ON public.push_subscriptions(revoked_at)
WHERE revoked_at IS NOT NULL;

-- =========================================================
-- 4. updated_at trigger for push_subscriptions
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_push_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at
ON public.push_subscriptions;

CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_push_subscriptions_updated_at();

-- =========================================================
-- 5. RLS for push_subscriptions
-- =========================================================

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own subscriptions"
ON public.push_subscriptions;

DROP POLICY IF EXISTS "Users can update their own subscriptions"
ON public.push_subscriptions;

DROP POLICY IF EXISTS "Users can read their own subscriptions"
ON public.push_subscriptions;

DROP POLICY IF EXISTS "Users can delete their own subscriptions"
ON public.push_subscriptions;

DROP POLICY IF EXISTS "Service role has full access to push_subscriptions"
ON public.push_subscriptions;

CREATE POLICY "Users can insert their own subscriptions"
ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.push_subscriptions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own subscriptions"
ON public.push_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to push_subscriptions"
ON public.push_subscriptions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- =========================================================
-- 6. notification_delivery_logs
-- =========================================================

CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  notification_id UUID REFERENCES public.user_notifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,

  channel TEXT NOT NULL,
  status TEXT NOT NULL,

  -- Store only redacted endpoint strings or endpoint hashes here.
  -- Do not store full Web Push endpoint URLs in logs exposed to operators.
  endpoint TEXT,
  error_code TEXT,
  error_message TEXT,

  payload_type TEXT,
  payload_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.notification_delivery_logs
DROP CONSTRAINT IF EXISTS notification_delivery_logs_channel_check;

ALTER TABLE public.notification_delivery_logs
ADD CONSTRAINT notification_delivery_logs_channel_check
CHECK (channel IN ('web_push', 'in_app'));

ALTER TABLE public.notification_delivery_logs
DROP CONSTRAINT IF EXISTS notification_delivery_logs_status_check;

ALTER TABLE public.notification_delivery_logs
ADD CONSTRAINT notification_delivery_logs_status_check
CHECK (status IN ('queued', 'sent', 'failed', 'expired', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_user_id
ON public.notification_delivery_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_notification_id
ON public.notification_delivery_logs(notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_subscription_id
ON public.notification_delivery_logs(subscription_id);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_channel_status
ON public.notification_delivery_logs(channel, status);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_created_at
ON public.notification_delivery_logs(created_at DESC);

-- =========================================================
-- 7. RLS for notification_delivery_logs
-- =========================================================

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own notification delivery logs"
ON public.notification_delivery_logs;

DROP POLICY IF EXISTS "Service role has full access to notification_delivery_logs"
ON public.notification_delivery_logs;

DROP POLICY IF EXISTS "Admins can read notification delivery logs"
ON public.notification_delivery_logs;

-- Intentionally no general authenticated-user SELECT policy here.
-- Delivery logs may contain push endpoint metadata and provider error details.
-- User-facing delivery state should be exposed only through a minimal server API if needed.

CREATE POLICY "Admins can read notification delivery logs"
ON public.notification_delivery_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

CREATE POLICY "Service role has full access to notification_delivery_logs"
ON public.notification_delivery_logs
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- =========================================================
-- 8. notification_reads
-- Purpose:
-- Track per-user read state for global notifications where user_notifications.user_id IS NULL.
-- Existing user-specific notifications can still use user_notifications.is_read.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.user_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id
ON public.notification_reads(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id
ON public.notification_reads(notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user_notification
ON public.notification_reads(user_id, notification_id);

-- =========================================================
-- 9. RLS for notification_reads
-- =========================================================

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own notification_reads"
ON public.notification_reads;

DROP POLICY IF EXISTS "Users can insert their own notification_reads"
ON public.notification_reads;

DROP POLICY IF EXISTS "Service role has full access to notification_reads"
ON public.notification_reads;

DROP POLICY IF EXISTS "Admins can read notification_reads"
ON public.notification_reads;

CREATE POLICY "Users can read their own notification_reads"
ON public.notification_reads
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification_reads"
ON public.notification_reads
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.user_notifications
    WHERE user_notifications.id = notification_id
      AND user_notifications.user_id IS NULL
  )
);

CREATE POLICY "Admins can read notification_reads"
ON public.notification_reads
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

CREATE POLICY "Service role has full access to notification_reads"
ON public.notification_reads
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- =========================================================
-- 10. Helpful indexes for user_notifications
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id
ON public.user_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_global
ON public.user_notifications(created_at DESC)
WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created_at
ON public.user_notifications(user_id, created_at DESC);

-- =========================================================
-- 11. Grants
-- =========================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.push_subscriptions
TO authenticated;

-- Do not grant notification_delivery_logs to authenticated users.
-- Admin reads are controlled by RLS through authenticated role privileges when available;
-- service_role is used by server-side API routes for inserts/updates.
REVOKE ALL
ON public.notification_delivery_logs
FROM authenticated;

GRANT SELECT, INSERT
ON public.notification_reads
TO authenticated;

GRANT ALL
ON public.push_subscriptions
TO service_role;

GRANT ALL
ON public.notification_delivery_logs
TO service_role;

GRANT ALL
ON public.notification_reads
TO service_role;

-- =========================================================
-- 12. PostgREST schema reload
-- =========================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
