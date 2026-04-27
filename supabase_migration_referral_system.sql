-- 1. Add referral and wallet columns to the users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS promotion_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS wallet_balance INTEGER NOT NULL DEFAULT 0;

-- 2. Create the wallet_transactions table to log all balance changes
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive for rewards, negative for withdrawals
    transaction_type TEXT NOT NULL, -- e.g., 'referral_reward', 'withdrawal'
    reference_id UUID, -- Optional: links to the booking or user that triggered this
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries on a user's transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
