const { createClient } = require('@supabase/supabase-js');

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setup() {
  console.log('🚀 開始建立影片基礎設施...\n');

  // ── Step 1：建立 coach_videos 資料表 ──
  const { error: tableError } = await s.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS coach_videos (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        coach_id UUID NOT NULL REFERENCES coaches(user_id) ON DELETE CASCADE,
        video_url TEXT NOT NULL,
        title VARCHAR(100) NOT NULL,
        category VARCHAR(20) CHECK (category IN ('teaching', 'intro', 'highlight')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE coach_videos ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Coach manages own videos" ON coach_videos;
      CREATE POLICY "Coach manages own videos"
        ON coach_videos FOR ALL
        USING (coach_id = auth.uid());

      DROP POLICY IF EXISTS "Public read videos" ON coach_videos;
      CREATE POLICY "Public read videos"
        ON coach_videos FOR SELECT
        USING (true);
    `
  });

  if (tableError) {
    console.error('❌ 資料表建立失敗 (Step 1)：', tableError.message);
  } else {
    console.log('✅ Step 1：coach_videos 資料表建立成功');
  }

  // ── Step 2：建立 Storage Bucket ──
  const { error: bucketError } = await s.storage.createBucket('coach-videos', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm']
  });

  if (bucketError) {
    if (bucketError.message.includes('already exists')) {
        console.log('✅ Step 2：coach-videos Bucket 已存在');
    } else {
        console.error('❌ Step 2：Bucket 建立失敗：', bucketError.message);
    }
  } else {
    console.log('✅ Step 2：coach-videos Bucket 建立成功');
  }

  // ── Step 3：驗證資料表是否可讀 ──
  const { data, error: verifyError } = await s
    .from('coach_videos')
    .select('*')
    .limit(1);

  if (verifyError) {
    console.error('❌ Step 3 驗證失敗：', verifyError.message);
  } else {
    console.log('✅ Step 3：資料表驗證成功，功能已就緒！');
  }

  console.log('\n🎉 基礎設施建立完成！');
}

setup();
