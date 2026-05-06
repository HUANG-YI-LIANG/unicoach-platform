const fs = require('fs');
const path = require('path');

const filesToExport = [
  "lib/coachPerformance.js",
  "app/admin/coach-performance/page.js",
  "app/admin/promotions/page.js",
  "app/dashboard/coach/page.js",
  "app/api/bookings/route.js",
  "app/api/bookings/[id]/status/route.js",
  "app/bookings/page.js",
  "app/api/auth/profile/route.js",
  "app/api/admin/coaches/route.js",
  "app/api/admin/coaches/[id]/commission/route.js",
  "supabase_migration_coach_performance.sql"
];

const outputFile = path.join(__dirname, '..', 'UniCoach_DynamicCommission_SourceCode.md');
let outputContent = '# UniCoach 動態教練績效與抽成系統完整原始碼\n\n此文件包含了實作「動態教練績效與抽成系統」的所有核心檔案，請協助尋找隱藏的 Bug 或邏輯漏洞。\n\n';

for (const file of filesToExport) {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(file).substring(1) || 'text';
    const lang = ext === 'js' ? 'javascript' : ext === 'sql' ? 'sql' : 'text';
    outputContent += `## File: ${file}\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
  } else {
    console.warn(`File not found: ${filePath}`);
  }
}

fs.writeFileSync(outputFile, outputContent, 'utf-8');
console.log(`Successfully exported to ${outputFile}`);
