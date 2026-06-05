import fs from 'fs';
import path from 'path';

/**
 * 將本地圖片上傳至 ImgBB 並取得公開 URL
 * @param {string} localPath - 本地圖片相對於專案根目錄的路徑 (例如: '/public/images/post1.png' 或 'content/posts/images/pic.png')
 * @returns {Promise<string>} 圖片的公開 URL
 */
export async function uploadToImgBB(localPath) {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey || apiKey === 'YOUR_IMGBB_API_KEY') {
    throw new Error('缺少 IMGBB_API_KEY 環境變數，無法將本地圖片轉為公開 URL。請至 https://api.imgbb.com/ 申請。');
  }

  // 處理絕對路徑與相對路徑。相對路徑只允許落在 public/ 之下，避免 Vercel/Turbopack
  // 因 path.join(process.cwd(), dynamicPath) 在 build trace 階段掃描整個 repo。
  const publicRoot = path.resolve(process.cwd(), 'public');
  let absolutePath;

  if (path.isAbsolute(localPath)) {
    absolutePath = path.resolve(localPath);
  } else {
    const trimmedPath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
    const relativePublicPath = trimmedPath.startsWith('public/')
      ? trimmedPath.slice('public/'.length)
      : trimmedPath;
    absolutePath = path.resolve(publicRoot, relativePublicPath);
  }

  if (!absolutePath.startsWith(`${publicRoot}${path.sep}`) && absolutePath !== publicRoot) {
    throw new Error('圖片路徑必須位於 public 目錄內，避免讀取任意本機檔案。');
  }

  if (!fs.existsSync(/* turbopackIgnore: true */ absolutePath)) {
    throw new Error(`找不到圖片檔案: ${absolutePath}`);
  }

  // 讀取圖片並轉為 base64
  const imageBuffer = fs.readFileSync(/* turbopackIgnore: true */ absolutePath);
  const base64Image = imageBuffer.toString('base64');

  // 使用 FormData API (Node.js 18+ 內建 fetch 支援 FormData)
  const formData = new FormData();
  formData.append('key', apiKey);
  formData.append('image', base64Image);
  
  // 可以選擇設定 expiration (秒)，但社群發文通常需要保留久一點，我們這裡不設過期

  try {
    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    
    if (!data.success) {
      throw new Error(`ImgBB 上傳失敗: ${data.error?.message || '未知錯誤'}`);
    }

    return data.data.url; // 取得公開 URL
  } catch (error) {
    console.error('[ImgBB API] 圖片上傳失敗:', error);
    throw error;
  }
}
