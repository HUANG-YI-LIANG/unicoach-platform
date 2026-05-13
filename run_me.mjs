import fs from 'fs';
import { execSync } from 'child_process';

console.log('\n======================================================');
console.log('🚀 準備將正確的 (未翻譯) SQL 指令交給您');
console.log('======================================================\n');

try {
  // 讀取已經合併好的 SQL 檔案
  const sqlContent = fs.readFileSync('consolidated_migrations.sql', 'utf8');

  // 1. 嘗試將 SQL 直接放入使用者的剪貼簿 (Windows)
  try {
    execSync('clip', { input: sqlContent });
    console.log('✅ 步驟一：已經將正確的英文 SQL 程式碼【自動複製到您的剪貼簿】了！');
  } catch (e) {
    console.log('⚠️ 自動複製到剪貼簿失敗，請使用步驟二的方法。');
  }

  // 2. 開啟記事本，確保不會被瀏覽器翻譯
  console.log('✅ 步驟二：現在會自動幫您用「記事本」打開這個 SQL 檔案。');
  console.log('\n👉【您的下一步】：');
  console.log('1. 直接回到剛剛的 Supabase 網頁，把原本報錯的中文全部刪掉。');
  console.log('2. 直接按 Ctrl + V (貼上)！');
  console.log('3. (如果您發現沒貼上，請從剛打開的記事本裡面全選複製)。');
  console.log('4. 按下右下角的 Run 執行即可！\n');

  // 打開記事本
  execSync('start notepad consolidated_migrations.sql');

} catch (error) {
  console.error('❌ 發生錯誤:', error.message);
}
