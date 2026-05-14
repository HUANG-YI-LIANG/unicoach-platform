// Because we are running outside Next.js, we mock getMetaConfig and the API functions
const META_GRAPH_URL = 'https://graph.facebook.com/v20.0';

function getMetaConfig() {
  return {
    pageId: process.env.META_PAGE_ID,
    igAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
    pageToken: process.env.META_PAGE_ACCESS_TOKEN,
  };
}

async function postToFacebook(message, link = null, imageUrls = [], dryRun = false) {
  const { pageId, pageToken } = getMetaConfig();
  if (!pageId || !pageToken) throw new Error('缺少 Facebook API 金鑰');

  let payload = { access_token: pageToken, message };
  if (link && imageUrls.length === 0) payload.link = link;

  if (imageUrls.length > 0) {
    const photoIds = [];
    for (const url of imageUrls) {
      const res = await fetch(`${META_GRAPH_URL}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, published: false, access_token: pageToken }),
      });
      const data = await res.json();
      if (data.error) throw new Error(`FB 圖片上傳失敗: ${data.error.message}`);
      photoIds.push(data.id);
    }
    payload.attached_media = photoIds.map(id => ({ media_fbid: id }));
  }

  const res = await fetch(`${META_GRAPH_URL}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  
  return { success: true, id: data.id };
}

async function run() {
  try {
    console.log('Testing FB Post with new token and page ID...');
    // We will just post a test string to see if the token works
    const result = await postToFacebook("【自動發文系統測試】這是一篇透過全新存取權杖發出的 FB 測試貼文！🚀", null, [], false);
    console.log('FB 發文成功!', result);
  } catch (error) {
    console.error('FB 發文失敗:', error.message);
  }
}

run();
