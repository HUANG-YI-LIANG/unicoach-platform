-- 推薦系統防作弊機制升級腳本
-- 請在 Supabase SQL Editor 執行此腳本

-- 1. 擴充 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_bound_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- 2. 擴充 bookings 表
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;

-- 3. 建立 reward_logs 表
CREATE TABLE IF NOT EXISTS reward_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES users(id),
    referred_user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID NOT NULL REFERENCES bookings(id),
    reward_type TEXT NOT NULL,
    reward_amount INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'released', 'cancelled', 'reversed')) DEFAULT 'pending',
    release_time TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    suspicious_flags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 加上索引加速查詢
CREATE INDEX IF NOT EXISTS idx_reward_logs_referrer ON reward_logs(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_reward_logs_status_release_time ON reward_logs(status, release_time);
