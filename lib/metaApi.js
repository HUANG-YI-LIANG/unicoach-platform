import { supabase } from './supabase';
import { sendMetaRateLimitWarning, sendMetaTokenError } from './discordNotifier';

async function handleMetaResponse(res) {
  const usageHeader = res.headers.get('x-app-usage');
  if (usageHeader) {
    try {
      const usage = JSON.parse(usageHeader);
      if (usage.call_count >= 80 || usage.total_time >= 80 || usage.total_cputime >= 80) {
        await sendMetaRateLimitWarning(usage);
      }
    } catch (e) {
      console.error('[Meta API] Failed to parse X-App-Usage header:', e);
    }
  }

  const data = await res.json();
  
  if (data.error) {
    const code = data.error.code;
    if (code === 190 || code === 102 || code === 104) {
      await sendMetaTokenError(code, data.error.message);
    }
  }
  
  return data;
}

const META_GRAPH_URL = 'https://graph.facebook.com/v20.0';

/**
 * 取得 Meta 環境變數
 */
function getMetaConfig() {
  return {
    pageId: process.env.META_PAGE_ID,
    igAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
    pageToken: process.env.META_PAGE_ACCESS_TOKEN,
  };
}

/**
 * 驗證 Meta Graph API 連線
 */
export async function verifyConnection() {
  const { pageId, igAccountId, pageToken } = getMetaConfig();
  
  if (!pageId || !pageToken) {
    throw new Error('缺少 META_PAGE_ID 或 META_PAGE_ACCESS_TOKEN 環境變數');
  }

  try {
    // 1. 驗證 Facebook Page
    const pageRes = await fetch(`${META_GRAPH_URL}/${pageId}?fields=name,id&access_token=${pageToken}`);
    const pageData = await handleMetaResponse(pageRes);
    
    if (pageData.error) {
      throw new Error(`Facebook API 錯誤: ${pageData.error.message}`);
    }

    // 2. 驗證 Instagram Business Account (如果有設定)
    let igData = null;
    if (igAccountId) {
      const igRes = await fetch(`${META_GRAPH_URL}/${igAccountId}?fields=name,username,profile_picture_url&access_token=${pageToken}`);
      igData = await handleMetaResponse(igRes);
      
      if (igData.error) {
        throw new Error(`Instagram API 錯誤: ${igData.error.message}`);
      }
    }

    return {
      success: true,
      facebook: { id: pageData.id, name: pageData.name },
      instagram: igData ? { id: igData.id, username: igData.username, name: igData.name } : null
    };
  } catch (error) {
    console.error('[Meta API] 連線驗證失敗:', error);
    throw error;
  }
}

/**
 * 發布純文字或連結或多張圖片至 Facebook 粉絲專頁
 * @param {string} message - 貼文內容
 * @param {string|null} link - 附加連結 (可選)
 * @param {Array<string>} imageUrls - 圖片的公開 URL 陣列 (可選)
 * @param {boolean} dryRun - 是否為測試模式 (不實際發出)
 */
export async function postToFacebook(message, link = null, imageUrls = [], dryRun = false) {
  const { pageId, pageToken } = getMetaConfig();
  if (!pageId || !pageToken) throw new Error('缺少 Facebook API 金鑰');

  if (dryRun) {
    console.log('[Meta API Dry Run] Facebook 貼文 Payload:', { message, link, imageUrls });
    return { success: true, id: 'dry_run_fb_post_id', dryRun: true };
  }

  let payload = { access_token: pageToken, message };
  if (link && imageUrls.length === 0) payload.link = link;

  // 如果有多圖，需要先上傳 unpublished photos
  if (imageUrls.length > 0) {
    const photoIds = [];
    for (const url of imageUrls) {
      const res = await fetch(`${META_GRAPH_URL}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, published: false, access_token: pageToken }),
      });
      const data = await handleMetaResponse(res);
      if (data.error) throw new Error(`FB 圖片上傳失敗: ${data.error.message}`);
      photoIds.push(data.id);
    }
    // 將照片 ID 綁定到貼文
    payload.attached_media = photoIds.map(id => ({ media_fbid: id }));
  }

  const res = await fetch(`${META_GRAPH_URL}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  const data = await handleMetaResponse(res);
  if (data.error) throw new Error(data.error.message);
  
  return { success: true, id: data.id };
}

/**
 * 發布圖片至 Instagram 商業帳號 (支援單圖與多圖輪播 Carousel)
 * @param {Array<string>} imageUrls - 公開可訪問的圖片 URL 陣列
 * @param {string} caption - 貼文內文
 * @param {boolean} dryRun - 是否為測試模式
 */
export async function postToInstagram(imageUrls = [], caption = '', dryRun = false) {
  const { igAccountId, pageToken } = getMetaConfig();
  if (!igAccountId || !pageToken) throw new Error('缺少 Instagram API 金鑰');
  if (imageUrls.length === 0) throw new Error('Instagram 發文至少需要一張圖片');

  // 確保 imageUrls 都是公開網址
  for (const url of imageUrls) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Instagram 發文需要公開可存取的圖片 URL，不能使用本地路徑。');
    }
  }

  if (dryRun) {
    console.log('[Meta API Dry Run] Instagram 圖片發文 Payload:', { imageUrls, caption });
    return { success: true, id: 'dry_run_ig_post_id', dryRun: true };
  }

  let finalCreationId = null;

  if (imageUrls.length === 1) {
    // 【單圖模式】
    const createRes = await fetch(`${META_GRAPH_URL}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrls[0], caption, access_token: pageToken }),
    });
    const createData = await handleMetaResponse(createRes);
    if (createData.error) throw new Error(`IG 單圖建立失敗: ${createData.error.message}`);
    finalCreationId = createData.id;
  } else {
    // 【輪播圖模式 Carousel】
    // Step 1: 建立每張圖的 Carousel Item
    const itemIds = [];
    for (const url of imageUrls) {
      const itemRes = await fetch(`${META_GRAPH_URL}/${igAccountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: pageToken }),
      });
      const itemData = await handleMetaResponse(itemRes);
      if (itemData.error) throw new Error(`IG 輪播子圖建立失敗: ${itemData.error.message}`);
      itemIds.push(itemData.id);
    }

    // Step 2: 建立母 Carousel Container
    const carouselRes = await fetch(`${META_GRAPH_URL}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'CAROUSEL', children: itemIds.join(','), caption, access_token: pageToken }),
    });
    const carouselData = await handleMetaResponse(carouselRes);
    if (carouselData.error) throw new Error(`IG 母輪播建立失敗: ${carouselData.error.message}`);
    finalCreationId = carouselData.id;
  }

  // 【等待 Meta 伺服器處理圖片容器】
  console.log(`[Meta API] 等待 30 秒讓 Meta 伺服器處理圖片容器 ${finalCreationId} (避免 2207008/2207027 錯誤)...`);
  await new Promise(resolve => setTimeout(resolve, 30000));

  // 【最終發布】Publish Container
  const publishRes = await fetch(`${META_GRAPH_URL}/${igAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: finalCreationId, access_token: pageToken }),
  });

  const publishData = await handleMetaResponse(publishRes);
  if (publishData.error) throw new Error(`IG 發布失敗: ${publishData.error.message}`);

  return { success: true, id: publishData.id };
}
