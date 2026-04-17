const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 從 .env.local 讀取環境變數
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceKey) {
  console.error('❌ 找不到 Supabase URL 或 Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runPatch() {
  console.log('🚀 開始執行資料庫結構更新...');

  const sql = `
    -- 1. 更新 coaches 表
    ALTER TABLE coaches ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
    ALTER TABLE coaches ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);

    DO $$ 
    BEGIN 
      -- 嘗試刪除現有的約束 (Supabase 默認命名通常是 table_column_check)
      ALTER TABLE coaches DROP CONSTRAINT IF EXISTS coaches_approval_status_check;
    EXCEPTION WHEN OTHERS THEN 
      NULL; 
    END $$;

    ALTER TABLE coaches ADD CONSTRAINT coaches_approval_status_check 
      CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));

    -- 2. 更新 user_files 表
    ALTER TABLE user_files ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
    ALTER TABLE user_files ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    ALTER TABLE user_files ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  `;

  // 透過 RPC 執行 SQL (前提是有定義 exec_sql 函式)
  // 如果沒有 exec_sql，我們將嘗試直接使用 REST API 可能受限
  // 在此環境中，我們通常建議透過一個臨時的 RPC 或者如果環境允許直接執行
  
  // 鑑於 Supabase JS SDK 不直接支持 raw SQL，我們嘗試使用 REST API 指令或
  // 提示用戶我們準備好了 SQL 腳本。
  
  console.log('------------------ SQL 內容 ------------------');
  console.log(sql);
  console.log('---------------------------------------------');
  
  // 嘗試透過 Postgres RPC 執行 (如果存在)
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
      console.warn('⚠️ 資料庫中未定義 exec_sql 函式，無法自動執行 SQL。');
      console.log('💡 請手動在 Supabase SQL Editor 中貼上並執行上方的 SQL 內容。');
    } else {
      console.error('❌ 執行失敗:', error.message);
    }
  } else {
    console.log('✅ 資料庫結構更新成功！');
  }
}

runPatch();
