import { NextResponse } from "next/server";

/**
 * UniCoach Middleware v4.0 (Emergency Cleanout)
 * 暫時移除所有外部依賴（Upstash Redis），確保開發環境 0ms 延遲。
 */
export function middleware(request) {
  // 對所有 API 請求直接放行，不進行速率限制
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
