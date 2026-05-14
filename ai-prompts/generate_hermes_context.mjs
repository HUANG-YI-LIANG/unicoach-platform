import fs from 'fs/promises';
import path from 'path';

const IGNORE_DIRS = ['node_modules', '.next', '.git', 'public', 'assets', 'ai-prompts'];
const IGNORE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.mp4', '.ttf', '.woff', '.woff2'];

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      if (IGNORE_DIRS.includes(dirent.name)) return [];
      return getFiles(res);
    } else {
      if (IGNORE_EXTS.includes(path.extname(res).toLowerCase())) return [];
      return res;
    }
  }));
  return Array.prototype.concat(...files);
}

async function main() {
  const rootDir = process.cwd();
  console.log('🔍 正在掃描專案目錄...');
  const allFiles = await getFiles(rootDir);
  
  let output = '# UniCoach (AMIKE) Codebase Context\n\n';
  output += '這是一份供 Hermes (GPT-5.5) 閱讀的專案核心程式碼脈絡。\n\n';
  
  // 為了避免 Token 爆掉，只過濾出後端核心與管理員相關的檔案供 Hermes 架構師閱讀
  const coreFiles = allFiles.filter(f => 
    f.includes(path.normalize('/app/api/')) || 
    f.includes(path.normalize('/app/admin/')) ||
    f.includes(path.normalize('/lib/')) ||
    f.endsWith('package.json') ||
    f.endsWith('prisma/schema.prisma') // 如果有的話
  );

  for (const file of coreFiles) {
    const relativePath = path.relative(rootDir, file);
    try {
      const content = await fs.readFile(file, 'utf-8');
      output += `\n\n==================================================\n`;
      output += `## File: ${relativePath}\n`;
      output += `==================================================\n`;
      output += `\`\`\`\n${content}\n\`\`\`\n`;
    } catch (e) {
      console.error(`❌ 無法讀取: ${relativePath}`);
    }
  }
  
  const outputPath = path.join(rootDir, 'ai-prompts', 'hermes_context.txt');
  await fs.writeFile(outputPath, output);
  console.log(`✅ 已成功生成: ${outputPath}`);
  console.log(`💡 請將此檔案內容提供給 Hermes，讓他了解專案的全貌與核心邏輯。`);
}

main().catch(console.error);
