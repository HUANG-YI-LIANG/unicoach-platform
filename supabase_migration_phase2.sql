-- Phase 2 Migration SQL: 預約狀態機與課程長度升級
-- 請在 Supabase SQL Editor 執行此腳本

-- 1. 新增課程長度欄位
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- 2. 為既有預約設定預設長度
UPDATE bookings
SET duration_minutes = 60
WHERE duration_minutes IS NULL;

-- 3. 新增付款過期期限欄位
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;

-- 4. 新增正式教練方案表
CREATE TABLE IF NOT EXISTS coach_plans (
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

CREATE INDEX IF NOT EXISTS idx_coach_plans_coach_id ON coach_plans(coach_id);

-- 5. 預約方案快照欄位
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS plan_id TEXT;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS plan_title TEXT;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS plan_snapshot TEXT;

-- 6. 正式教練固定可預約時段表
CREATE TABLE IF NOT EXISTS coach_availability_rules (
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

CREATE INDEX IF NOT EXISTS idx_coach_availability_rules_coach_id ON coach_availability_rules(coach_id);

-- 7. 單日例外時段：請假/停課/臨時加開
CREATE TABLE IF NOT EXISTS coach_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK(exception_type IN ('available', 'unavailable')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK(end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_coach_availability_exceptions_coach_id_date
ON coach_availability_exceptions(coach_id, exception_date);

-- 8. 短影音互動統計
ALTER TABLE coach_videos
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

ALTER TABLE coach_videos
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

ALTER TABLE coach_videos
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES coach_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);

-- 9. AI 課後報告草稿與審計欄位
ALTER TABLE learning_reports
ADD COLUMN IF NOT EXISTS ai_draft_observation TEXT;

ALTER TABLE learning_reports
ADD COLUMN IF NOT EXISTS ai_draft_suggestions TEXT;

ALTER TABLE learning_reports
ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ;

ALTER TABLE learning_reports
ADD COLUMN IF NOT EXISTS ai_model TEXT;

ALTER TABLE learning_reports
ADD COLUMN IF NOT EXISTS ai_prompt_snapshot TEXT;

ALTER TABLE learning_reports
ADD COLUMN IF NOT EXISTS ai_applied_at TIMESTAMPTZ;

-- 10. 結算批次與 booking 關聯
ALTER TABLE settlement_batches
ADD COLUMN IF NOT EXISTS booking_count INTEGER DEFAULT 0;

ALTER TABLE settlement_batches
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE settlement_batches
DROP CONSTRAINT IF EXISTS settlement_batches_status_check;

ALTER TABLE settlement_batches
ADD CONSTRAINT settlement_batches_status_check
CHECK(status IN ('pending', 'paid', 'cancelled'));

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES settlement_batches(id);

CREATE INDEX IF NOT EXISTS idx_bookings_settlement_id ON bookings(settlement_id);
