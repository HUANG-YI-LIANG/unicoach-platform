import { NextResponse } from "next/server";
import { strictLimiter, generalLimiter, passwordResetLimiter, getClientIp } from '@/lib/rateLimit';

function selectLimiter(pathname) {
  if (pathname === '/api/auth/forgot-password' || pathname === '/api/auth/reset-password') {
    return passwordResetLimiter;
  }

  if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
    return strictLimiter;
  }

  return generalLimiter;
}

function isLimiterUnavailable(result) {
  return String(result?.reason || '').startsWith('rate-limit-unavailable:');
}

function rateLimitHeaders(result) {
  return {
    'x-ratelimit-limit': String(Number.isFinite(result.limit) ? result.limit : 0),
    'x-ratelimit-remaining': String(Number.isFinite(result.remaining) ? result.remaining : 0),
    'x-ratelimit-reset': String(result.reset || Date.now()),
  };
}

/**
 * UniCoach Proxy (Migrated from Middleware v4.0)
 * Applies production-safe rate limiting to all API requests.
 */
export async function proxy(request) {
  const pathname = request.nextUrl?.pathname || '';
  const method = request.method || 'GET';
  const clientIp = getClientIp(request);
  const selectedLimiter = selectLimiter(pathname);
  const result = await selectedLimiter.limit(`${clientIp}:${method}:${pathname}`);

  if (!result.success) {
    if (isLimiterUnavailable(result)) {
      return NextResponse.json(
        { error: '服務忙碌，請稍後再試' },
        { status: 503, headers: rateLimitHeaders(result) },
      );
    }

    return NextResponse.json(
      { error: '請求過於頻繁，請稍後再試' },
      { status: 429, headers: rateLimitHeaders(result) },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
