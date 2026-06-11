import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { safeErrorDetails } from '@/lib/safeLogging';

function shouldFailClosed() {
  return process.env.NODE_ENV === 'production';
}

function createAllowLimiter(prefix) {
  return {
    async limit(identifier = 'anonymous') {
      return {
        success: true,
        limit: Number.POSITIVE_INFINITY,
        remaining: Number.POSITIVE_INFINITY,
        reset: Date.now(),
        pending: Promise.resolve(),
        reason: `rate-limit-disabled:${prefix}:${identifier ? 'provided' : 'missing'}`,
      };
    },
  };
}

function createFailClosedLimiter(prefix) {
  return {
    async limit(identifier = 'anonymous') {
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 60_000,
        pending: Promise.resolve(),
        reason: `rate-limit-unavailable:${prefix}:${identifier ? 'provided' : 'missing'}`,
      };
    },
  };
}

function createRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function createLimiter({ prefix, requests, window }) {
  const redis = createRedis();
  if (!redis) {
    if (shouldFailClosed()) {
      console.error('[RATE_LIMIT_CONFIG_MISSING]', { prefix, environment: 'production' });
      return createFailClosedLimiter(prefix);
    }
    return createAllowLimiter(prefix);
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix,
  });

  return {
    async limit(identifier = 'anonymous') {
      try {
        return await limiter.limit(identifier);
      } catch (error) {
        console.error('[RATE_LIMIT_ERROR]', safeErrorDetails(error));
        if (shouldFailClosed()) {
          return createFailClosedLimiter(prefix).limit(identifier);
        }
        return createAllowLimiter(prefix).limit(identifier);
      }
    },
  };
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

// ============================================================
// 策略一：嚴格模式 — 認證端點專用
// 規則：同一 IP，每 15 分鐘最多 10 次
// 適用：POST /api/auth/login, POST /api/auth/register
// ============================================================
export const strictLimiter = createLimiter({
  prefix: "rl:strict",
  requests: 10,
  window: "15 m",
});

// ============================================================
// 策略二：一般模式 — 業務 API 端點
// 規則：同一 IP，每 1 分鐘最多 60 次
// 適用：/api/reviews, /api/bookings, /api/coaches 等
// ============================================================
export const generalLimiter = createLimiter({
  prefix: "rl:general",
  requests: 60,
  window: "1 m",
});

// ============================================================
// 策略三：超嚴格模式 — 密碼重設專用
// 規則：同一 IP，每 1 小時最多 5 次
// ============================================================
export const passwordResetLimiter = createLimiter({
  prefix: "rl:password_reset",
  requests: 5,
  window: "1 h",
});
