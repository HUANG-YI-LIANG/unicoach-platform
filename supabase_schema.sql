-- Supabase Schema for College Sports Coaching Platform
-- Please run this script in the Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Create Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT CHECK(role IN ('admin', 'coach', 'user')) NOT NULL DEFAULT 'user',
  level INTEGER DEFAULT 1,
  is_frozen BOOLEAN DEFAULT false,
  address TEXT,
  gender TEXT,
  grade TEXT,
  language TEXT DEFAULT '中文',
  learning_goals TEXT,
  avatar_url TEXT DEFAULT NULL,
  promotion_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  wallet_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Coaches
CREATE TABLE coaches (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  university TEXT,
  location TEXT,
  service_areas TEXT,
  languages TEXT,
  experience TEXT,
  philosophy TEXT,
  target_audience TEXT,
  available_times TEXT,
  base_price INTEGER NOT NULL DEFAULT 1000,
  commission_rate INTEGER NOT NULL DEFAULT 45,
  approval_status TEXT CHECK(approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  bio TEXT,
  videos TEXT,
  photos TEXT
);

-- 3. Create Coach Plans
CREATE TABLE coach_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coach_plans_coach_id ON coach_plans(coach_id);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  discount_code TEXT,
  discount_percent INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);

-- 4. Create Coach Availability
CREATE TABLE coach_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK(weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK(end_time > start_time)
);

CREATE INDEX idx_coach_availability_rules_coach_id ON coach_availability_rules(coach_id);

CREATE TABLE coach_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK(exception_type IN ('available', 'unavailable')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK(end_time > start_time),
  CONSTRAINT coach_availability_exceptions_no_overlap
    EXCLUDE USING gist (
      coach_id WITH =,
      exception_date WITH =,
      timerange(start_time, end_time, '[)') WITH &&
    )
);

CREATE INDEX idx_coach_availability_exceptions_coach_id_date ON coach_availability_exceptions(coach_id, exception_date);

-- 5. Create Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  coach_id UUID NOT NULL REFERENCES users(id),
  expected_time TIMESTAMPTZ NOT NULL,
  base_price INTEGER NOT NULL,
  discount_amount INTEGER DEFAULT 0,
  price_adjustment INTEGER NOT NULL DEFAULT 0,
  final_price INTEGER NOT NULL,
  deposit_paid INTEGER DEFAULT 0,
  platform_fee INTEGER NOT NULL,
  coach_payout INTEGER NOT NULL,
  payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'refunded', 'expired')) DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  amount_total INTEGER,
  amount_deposit INTEGER,
  status TEXT CHECK(status IN ('pending_payment', 'scheduled', 'in_progress', 'pending_completion', 'completed', 'disputed', 'cancelled', 'refunded')) DEFAULT 'pending_payment',
  grade TEXT,
  gender TEXT,
  attendees_count INTEGER DEFAULT 1,
  learning_status TEXT,
  coupon_id TEXT,
  coupon_discount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  series_id TEXT,
  recurrence_pattern TEXT,
  session_number INTEGER,
  duration_minutes INTEGER DEFAULT 60,
  payment_expires_at TIMESTAMPTZ,
  plan_id TEXT,
  plan_title TEXT,
  plan_snapshot TEXT,
  settlement_id UUID,
  CONSTRAINT bookings_non_negative_money CHECK (
    base_price >= 0
    AND discount_amount >= 0
    AND final_price >= 0
    AND deposit_paid >= 0
    AND platform_fee >= 0
    AND coach_payout >= 0
    AND COALESCE(price_adjustment, 0) >= 0
    AND COALESCE(coupon_discount, 0) >= 0
  ),
  CONSTRAINT bookings_paid_state_consistency CHECK (
    (
      payment_status = 'paid'
      AND paid_at IS NOT NULL
      AND status IN ('scheduled', 'in_progress', 'pending_completion', 'completed', 'disputed', 'refunded')
    )
    OR (
      payment_status <> 'paid'
      AND status NOT IN ('scheduled', 'in_progress', 'pending_completion', 'completed')
    )
  )
);

-- 6. Create Chat Rooms & Messages
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES users(id),
  coach_id UUID NOT NULL REFERENCES users(id),
  pair_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chat_rooms_pair_key_unique UNIQUE (pair_key)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- 8. Create Learning Reports
CREATE TABLE learning_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  coach_id UUID NOT NULL REFERENCES users(id),
  completed_items TEXT NOT NULL,
  focus_score INTEGER CHECK(focus_score >= 1 AND focus_score <= 5),
  cooperation_score INTEGER CHECK(cooperation_score >= 1 AND cooperation_score <= 5),
  completion_score INTEGER CHECK(completion_score >= 1 AND completion_score <= 5),
  understanding_score INTEGER CHECK(understanding_score >= 1 AND understanding_score <= 5),
  observation TEXT,
  suggestions TEXT,
  ai_draft_observation TEXT,
  ai_draft_suggestions TEXT,
  ai_generated_at TIMESTAMPTZ,
  ai_model TEXT,
  ai_prompt_snapshot TEXT,
  ai_applied_at TIMESTAMPTZ,
  media_urls TEXT,
  progress_level TEXT CHECK(progress_level IN ('obvious', 'slight', 'none', 'needs_improvement')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Platform Settings
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Password Reset Tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- 11. Settlement Batches (Monthly)
CREATE TABLE settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  coach_id UUID NOT NULL REFERENCES users(id),
  total_amount INTEGER NOT NULL,
  booking_count INTEGER DEFAULT 0,
  status TEXT CHECK(status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT settlement_batches_non_negative_totals CHECK (
    total_amount >= 0
    AND booking_count >= 0
  )
);

CREATE UNIQUE INDEX settlement_batches_unique_active_coach_month
ON settlement_batches (month, coach_id)
WHERE (status <> 'cancelled');

CREATE INDEX idx_bookings_unsettled_paid_completed
ON bookings (completed_at, coach_id)
WHERE (
  status = 'completed'
  AND payment_status = 'paid'
  AND paid_at IS NOT NULL
  AND settlement_id IS NULL
);

ALTER TABLE bookings
ADD CONSTRAINT bookings_settlement_id_fkey
FOREIGN KEY (settlement_id) REFERENCES settlement_batches(id);

-- 10. Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT CHECK(type IN ('first_booking', 'referral', 'level')) NOT NULL,
  discount_percent INTEGER NOT NULL,
  max_amount INTEGER NOT NULL,
  valid_until TIMESTAMPTZ,
  used_at TIMESTAMPTZ
);

-- 11. Referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referee_id UUID NOT NULL REFERENCES users(id),
  status TEXT CHECK(status IN ('pending', 'successful')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Admin Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Terms Consents
CREATE TABLE terms_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  terms_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. User Files
CREATE TABLE user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  original_filename TEXT,
  stored_filename TEXT,
  file_size INTEGER,
  mime_type TEXT,
  thumbnail_url TEXT,
  compressed_url TEXT,
  verification_status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_files_user_id ON user_files(user_id);
CREATE INDEX idx_user_files_file_type ON user_files(file_type);

-- 15. Coach Uploaded Videos
CREATE TABLE coach_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT CHECK(category IN ('teaching', 'intro', 'highlight')),
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES coach_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

CREATE INDEX idx_video_likes_video_id ON video_likes(video_id);

-- 16. User/Coach Video Links (YouTube/Vimeo)
CREATE TABLE user_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT CHECK(platform IN ('youtube', 'vimeo')),
  video_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  duration INTEGER,
  duration_formatted TEXT,
  category TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_videos_user_id ON user_videos(user_id);

-- Insert Default Demo Accounts
-- Normally passwords should be encrypted. For this migration, please create them from the frontend login system or insert mock encrypted passwords manually.
ALTER TABLE users ADD COLUMN IF NOT EXISTS frequent_addresses TEXT;
