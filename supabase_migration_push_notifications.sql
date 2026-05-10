-- Push Notifications infrastructure migration
-- Purpose: Create push_subscriptions table to store Web Push endpoints

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

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own subscriptions"
ON public.push_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.push_subscriptions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own subscriptions"
ON public.push_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to push_subscriptions"
ON public.push_subscriptions TO service_role
USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
