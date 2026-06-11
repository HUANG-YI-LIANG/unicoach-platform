import { NextResponse } from 'next/server';

// 強制使用動態渲染
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  // 1. 驗證 CRON_SECRET 保護路由
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 取得環境變數
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const oldToken = process.env.META_PAGE_ACCESS_TOKEN; // 這裡用做 MVP 範例，實際上應該是要更新 User Token

  if (!appId || !appSecret || !oldToken) {
    return NextResponse.json({ error: '缺少必要的 META 憑證' }, { status: 500 });
  }

  try {
    // 呼叫 Graph API 交換長效期 Token
    const res = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${oldToken}`);
    
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    // TODO: 將新的 Token 寫入資料庫或 .env 檔案中
    // 由於 Vercel 部署環境下無法直接修改 .env 檔案，建議將續期後的 Token 存入 Supabase 或 Upstash Redis。
    // 這邊僅示範取得新 Token 的邏輯
    
    console.log('[Token Renewal] 成功取得新 Token (有效期限約 60 天)');
    
    return NextResponse.json({
      message: 'Token 續期成功',
      expires_in: data.expires_in || 'Never',
      // 新的 Token 應該要被安全儲存，這裡僅為測試輸出部分字元
      token_preview: data.access_token.substring(0, 10) + '...'
    });

  } catch (error) {
    console.error('[Token Renewal] 續期失敗:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
