/**
 * Database Migration & Verification Utility
 * 
 * NOTE: Standard Supabase Client (supabase-js) does not support execution of 
 * RAW SQL DDL (ALTER TABLE, CREATE TABLE, etc.) directly.
 * 
 * Please run the SQL migration script in the Supabase Dashboard SQL Editor first,
 * then run this script to verify the changes.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables manually if needed, or assume they are present
// For this script, we'll try to read .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('--- Database Migration Verification ---');
  
  // 1. Check users.avatar_url
  console.log('Checking users.avatar_url...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('avatar_url')
    .limit(1);
  
  if (userError) {
    console.error('❌ users.avatar_url check failed:', userError.message);
  } else {
    console.log('✅ users.avatar_url exists.');
  }

  // 2. Check audit_logs.actor_id and actor_role
  console.log('Checking audit_logs columns...');
  const { data: auditData, error: auditError } = await supabase
    .from('audit_logs')
    .select('actor_id, actor_role')
    .limit(1);

  if (auditError) {
    console.error('❌ audit_logs columns check failed:', auditError.message);
  } else {
    console.log('✅ audit_logs.actor_id and actor_role exist.');
  }

  // 3. Check user_files table
  console.log('Checking user_files table...');
  const { data: fileData, error: fileError } = await supabase
    .from('user_files')
    .select('*')
    .limit(1);

  if (fileError) {
    console.error('❌ user_files table check failed:', fileError.message);
  } else {
    console.log('✅ user_files table exists.');
  }

  // 4. Check coach_videos table
  console.log('Checking coach_videos table...');
  const { data: coachVideoData, error: coachVideoError } = await supabase
    .from('coach_videos')
    .select('*')
    .limit(1);

  if (coachVideoError) {
    console.error('❌ coach_videos table check failed:', coachVideoError.message);
  } else {
    console.log('✅ coach_videos table exists.');
  }

  // 5. Check user_videos table
  console.log('Checking user_videos table...');
  const { data: userVideoData, error: userVideoError } = await supabase
    .from('user_videos')
    .select('*')
    .limit(1);

  if (userVideoError) {
    console.error('❌ user_videos table check failed:', userVideoError.message);
  } else {
    console.log('✅ user_videos table exists.');
  }

  // 6. Check user_files audit columns
  console.log('Checking user_files audit columns...');
  const { data: fileAuditData, error: fileAuditError } = await supabase
    .from('user_files')
    .select('reviewed_by, reviewed_at, rejection_reason')
    .limit(1);

  if (fileAuditError) {
    console.error('❌ user_files audit columns check failed:', fileAuditError.message);
  } else {
    console.log('✅ user_files audit columns exist.');
  }

  console.log('---------------------------------------');
  if (!userError && !auditError && !fileError && !coachVideoError && !userVideoError && !fileAuditError) {
    console.log('Migration Verification SUCCESSFUL!');
  } else {
    console.log('Migration Verification FAILED. Please check SQL execution results.');
  }
}

console.log('SQL to execute in Supabase SQL Editor:');
console.log(`
-- ============================
-- 更新 audit_logs 表結構
-- ============================

-- [1] 新增 actor_id 欄位
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actor_role TEXT DEFAULT NULL;

-- [2] 將舊的 admin_id 資料轉移至 actor_id
UPDATE audit_logs
  SET actor_id = admin_id
  WHERE admin_id IS NOT NULL;

-- [3] 移除舊的 admin_id 欄位，確保安全
ALTER TABLE audit_logs
  DROP COLUMN IF EXISTS admin_id;

-- ============================
-- 建立影片相關資料表
-- ============================

-- [4] 建立 coach_videos
CREATE TABLE IF NOT EXISTS coach_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT CHECK(category IN ('teaching', 'intro', 'highlight')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [5] 建立 user_videos
CREATE TABLE IF NOT EXISTS user_videos (
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

CREATE INDEX IF NOT EXISTS idx_user_videos_user_id ON user_videos(user_id);

-- ============================
-- 修復審核功能的架構偏差
-- ============================

-- [6] 擴充 coaches.approval_status 的校驗約束
ALTER TABLE coaches DROP CONSTRAINT IF EXISTS coaches_approval_status_check;
ALTER TABLE coaches ADD CONSTRAINT coaches_approval_status_check 
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));

-- [7] 補齊 user_files 審核追蹤欄位
ALTER TABLE user_files 
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================
-- 驗證語法
-- ============================
SELECT 'audit_logs ok' as status FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_id'
UNION ALL
SELECT 'coach_videos ok' FROM information_schema.tables WHERE table_name = 'coach_videos'
UNION ALL
SELECT 'user_videos ok' FROM information_schema.tables WHERE table_name = 'user_videos'
UNION ALL
SELECT 'user_files audit ok' FROM information_schema.columns WHERE table_name = 'user_files' AND column_name = 'reviewed_by';
`);

console.log('\n--- IMPORTANT: Storage Buckets ---');
console.log('Please ensure the following buckets are created in Supabase Storage and set to PUBLIC:');
console.log('1. "avatars" - For user profile pictures');
console.log('2. "verifications" - For coach identity documents');
console.log('3. "coach-videos" - For coach uploaded mp4/webm files');

if (process.argv.includes('--verify')) {
  verifyMigration();
} else {
  console.log('\nRun "node scripts/db-migration.js --verify" after executing the SQL above.');
}
