import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================
// Redis 連線實例（單例模式，避免重複建立連線）
// ============================================================
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ============================================================
// 策略一：嚴格模式 — 認證端點專用
// 規則：同一 IP，每 15 分鐘最多 10 次
// 適用：POST /api/auth/login, POST /api/auth/register
// ============================================================
export const strictLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  analytics: true,
  prefix: "rl:strict",
});

// ============================================================
// 策略二：一般模式 — 業務 API 端點
// 規則：同一 IP，每 1 分鐘最多 60 次
// 適用：/api/reviews, /api/bookings, /api/coaches 等
// ============================================================
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
  prefix: "rl:general",
});

// ============================================================
// 策略三：超嚴格模式 — 密碼重設專用（預留）
// 規則：同一 IP，每 1 小時最多 5 次
// ============================================================
export const passwordResetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix: "rl:password_reset",
});
