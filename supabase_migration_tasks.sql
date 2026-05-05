-- 任務與成就系統升級腳本
-- 請在 Supabase SQL Editor 執行此腳本

-- 1. 新增觀看影片紀錄
ALTER TABLE users ADD COLUMN IF NOT EXISTS video_watched_10s BOOLEAN DEFAULT false;

-- 2. 新增學生查看紀錄卡時間
ALTER TABLE learning_reports ADD COLUMN IF NOT EXISTS student_viewed_at TIMESTAMPTZ;

-- 3. 建立收藏教練資料表
CREATE TABLE IF NOT EXISTS favorite_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, coach_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_coaches_user ON favorite_coaches(user_id);
