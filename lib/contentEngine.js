import fs from 'fs';
import path from 'path';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const PUBLISHED_DIR = path.join(POSTS_DIR, 'published');

/**
 * 確保資料夾存在
 */
function ensureDirectories() {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PUBLISHED_DIR)) {
    fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  }
}

/**
 * 手動解析 Markdown 的 frontmatter (YAML-like)
 * 為了避免依賴外部套件，這裡實作一個簡易的解析器
 * @param {string} fileContent 
 */
function parseFrontmatter(fileContent) {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!match) {
    return { data: {}, content: fileContent.trim() };
  }
  
  const data = {};
  const frontmatterStr = match[1];
  const bodyContent = match[2].trim();
  
  frontmatterStr.split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      
      // 移除頭尾引號
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // 簡單解析陣列 [ "ig", "fb" ]
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          // 將單引號轉為雙引號以便 JSON.parse
          value = JSON.parse(value.replace(/'/g, '"'));
        } catch (e) {
          // 如果解析失敗，就退回用逗號分隔
          value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        }
      }
      
      data[key] = value;
    }
  });
  
  return { data, content: bodyContent };
}

/**
 * 讀取所有待發布的貼文
 */
export function getPendingPosts() {
  ensureDirectories();
  
  const files = fs.readdirSync(POSTS_DIR);
  const pendingFiles = files.filter(file => file.endsWith('.md') && !fs.statSync(path.join(POSTS_DIR, file)).isDirectory());
  
  const posts = pendingFiles.map(file => {
    const filePath = path.join(POSTS_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = parseFrontmatter(fileContent);
    
    return {
      fileName: file,
      filePath,
      frontmatter: data,
      content,
    };
  });
  
  return posts;
}

/**
 * 將貼文標記為已發布 (移動到 published 資料夾)
 * @param {string} fileName 
 */
export function markAsPublished(fileName) {
  ensureDirectories();
  const sourcePath = path.join(POSTS_DIR, fileName);
  const targetPath = path.join(PUBLISHED_DIR, fileName);
  
  if (fs.existsSync(sourcePath)) {
    // 也可以考慮加上發布時間後綴： const newName = fileName.replace('.md', `_${Date.now()}.md`);
    fs.renameSync(sourcePath, targetPath);
    console.log(`[Content Engine] 貼文已標記為發布並移至: ${targetPath}`);
    return true;
  }
  return false;
}
