-- Supabase Schema for College Sports Coaching Platform
-- Please run this script in the Supabase SQL Editor

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
  language TEXT DEFAULT '中文',
  learning_goals TEXT,
  avatar_url TEXT DEFAULT NULL,
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

-- 3. Create Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  coach_id UUID NOT NULL REFERENCES users(id),
  expected_time TIMESTAMPTZ NOT NULL,
  base_price INTEGER NOT NULL,
  discount_amount INTEGER DEFAULT 0,
  final_price INTEGER NOT NULL,
  deposit_paid INTEGER DEFAULT 0,
  platform_fee INTEGER NOT NULL,
  coach_payout INTEGER NOT NULL,
  payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  amount_total INTEGER,
  amount_deposit INTEGER,
  status TEXT CHECK(status IN ('pending_payment', 'scheduled', 'in_progress', 'pending_completion', 'completed', 'disputed', 'cancelled', 'refunded')) DEFAULT 'pending_payment',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. Create Chat Rooms & Messages
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES users(id),
  coach_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Reviews
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

-- 6. Create Learning Reports
CREATE TABLE learning_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id),
  coach_id UUID NOT NULL REFERENCES users(id),
  completed_items TEXT NOT NULL,
  focus_score INTEGER CHECK(focus_score >= 1 AND focus_score <= 5),
  cooperation_score INTEGER CHECK(cooperation_score >= 1 AND cooperation_score <= 5),
  completion_score INTEGER CHECK(completion_score >= 1 AND completion_score <= 5),
  understanding_score INTEGER CHECK(understanding_score >= 1 AND understanding_score <= 5),
  observation TEXT,
  suggestions TEXT,
  media_urls TEXT,
  progress_level TEXT CHECK(progress_level IN ('obvious', 'slight', 'none', 'needs_improvement')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Settlement Batches (Monthly)
CREATE TABLE settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  coach_id UUID NOT NULL REFERENCES users(id),
  total_amount INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending', 'paid')) DEFAULT 'pending',
  paid_at TIMESTAMPTZ
);

-- 8. Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT CHECK(type IN ('first_booking', 'referral', 'level')) NOT NULL,
  discount_percent INTEGER NOT NULL,
  max_amount INTEGER NOT NULL,
  valid_until TIMESTAMPTZ,
  used_at TIMESTAMPTZ
);

-- 9. Referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referee_id UUID NOT NULL REFERENCES users(id),
  status TEXT CHECK(status IN ('pending', 'successful')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Admin Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Terms Consents
CREATE TABLE terms_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  terms_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. User Files
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

-- 13. Coach Uploaded Videos
CREATE TABLE coach_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT CHECK(category IN ('teaching', 'intro', 'highlight')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. User/Coach Video Links (YouTube/Vimeo)
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
