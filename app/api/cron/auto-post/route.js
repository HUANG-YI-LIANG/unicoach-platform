import { NextResponse } from 'next/server';
import { getPendingPosts, markAsPublished } from '@/lib/contentEngine';
import { postToFacebook, postToInstagram } from '@/lib/metaApi';
import { uploadToImgBB } from '@/lib/imgbbApi';

// 強制使用動態渲染，避免靜態快取
export const dynamic = 'force-dynamic';

export async function GET(request) {
  // 1. 驗證 CRON_SECRET 保護路由
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. 取得所有待發布的貼文
    const pendingPosts = getPendingPosts();
    const now = new Date();
    
    // 過濾出「發布時間已到」的貼文
    const postsToPublish = pendingPosts.filter(post => {
      if (!post.frontmatter.date) return false;
      const postDate = new Date(post.frontmatter.date);
      return postDate <= now;
    });

    if (postsToPublish.length === 0) {
      return NextResponse.json({ message: '目前沒有需要發布的排程貼文。' });
    }

    const results = [];

    // 3. 逐一處理並發布貼文
    for (const post of postsToPublish) {
      const { fileName, content, frontmatter } = post;
      const platforms = frontmatter.platforms || [];
      const images = frontmatter.images || [];
      
      let publicImageUrls = [];
      let postResult = { fileName, fb: null, ig: null, error: null };

      try {
        // 如果有圖片，我們需要將本地圖片全部轉為公開 URL
        if (images.length > 0) {
          console.log(`[Auto Post] 準備上傳 ${images.length} 張圖片至 ImgBB...`);
          // 平行上傳所有圖片
          publicImageUrls = await Promise.all(
            images.map(localPath => uploadToImgBB(localPath))
          );
        }

        // 發布至 Facebook
        if (platforms.includes('fb')) {
          console.log(`[Auto Post] 發布至 FB: ${fileName}`);
          postResult.fb = await postToFacebook(content, null, publicImageUrls, false);
        }

        // 發布至 Instagram
        if (platforms.includes('ig')) {
          if (publicImageUrls.length === 0) {
            throw new Error('發布至 IG 需要圖片，但無法取得公開圖片網址。');
          }
          console.log(`[Auto Post] 發布至 IG: ${fileName} (${publicImageUrls.length} 張圖)`);
          postResult.ig = await postToInstagram(publicImageUrls, content, false);
        }

        // 4. 發布成功後，將檔案標記為已發布 (移動至 published 資料夾)
        markAsPublished(fileName);
        postResult.status = 'published';

      } catch (err) {
        console.error(`[Auto Post] 發布失敗 (${fileName}):`, err);
        postResult.status = 'failed';
        postResult.error = err.message;
      }

      results.push(postResult);
    }

    return NextResponse.json({
      message: `成功處理 ${results.length} 篇貼文。`,
      results
    });

  } catch (error) {
    console.error('[Auto Post] 系統發生錯誤:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
