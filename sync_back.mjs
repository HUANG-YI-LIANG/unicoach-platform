import fs from 'fs';
import path from 'path';

const src = 'D:/HermesSpace/AMIKE/platform';
const dest = 'D:/Codex/AMIKE/platform';

function copyDir(currentSrc, currentDest) {
  if (currentSrc.includes('node_modules') || currentSrc.includes('.next') || currentSrc.includes('.git') || currentSrc.includes('backups')) return;
  
  if (!fs.existsSync(currentDest)) {
    fs.mkdirSync(currentDest, { recursive: true });
  }

  const entries = fs.readdirSync(currentSrc, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(currentSrc, entry.name);
    const destPath = path.join(currentDest, entry.name);
    
    // 排除特定檔案
    if (entry.name.endsWith('_bak.js') || entry.name === 'platform-session.md' || entry.name.startsWith('.env') || entry.name === 'MIKE_PUSH_SYNC.md') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('開始從 HermesSpace 同步至 Codex 工作區...');
  copyDir(src, dest);
  console.log('✅ 同步完成！Codex 工作區現在是最新黃金版本！');
} catch (error) {
  console.error('❌ 同步失敗:', error);
}
