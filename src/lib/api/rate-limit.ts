import { randomUUID } from 'crypto';

import { kv } from '@vercel/kv';

const HOUR_SECONDS = 60 * 60;
const MINUTE_SECONDS = 60;

export type ApiRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds?: number;
};

/** Compute the per-minute burst limit based on hourly quota. */
export const getBurstLimit = (rateLimit: number) => (rateLimit >= 10000 ? 500 : 100);

/** Build standard rate limit headers for API responses. */
export const buildRateLimitHeaders = (result: ApiRateLimitResult) => {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  if (result.retryAfterSeconds) {
    headers.set('Retry-After', result.retryAfterSeconds.toString());
  }
  return headers;
};

/** Increment rate limit counters and return allowance data. */
export const enforceApiRateLimit = async (params: {
  keyId: string;
  limit: number;
  burst: number;
}): Promise<ApiRateLimitResult> => {
  const hourKey = `rate:api:${params.keyId}:hour`;
  const minuteKey = `rate:api:${params.keyId}:minute`;
  const now = Date.now();
  const minuteWindowStart = now - MINUTE_SECONDS * 1000;

  const hourCount = await kv.incr(hourKey);
  await kv.expire(hourKey, HOUR_SECONDS, 'NX');

  await kv.zremrangebyscore(minuteKey, 0, minuteWindowStart);
  await kv.zadd(minuteKey, { score: now, member: `${now}-${randomUUID()}` });
  await kv.expire(minuteKey, MINUTE_SECONDS);

  const [hourTtl, minuteCount, minuteEntries] = await Promise.all([
    kv.ttl(hourKey),
    kv.zcard(minuteKey),
    kv.zrange(minuteKey, 0, 0, { withScores: true }),
  ]);

  const rawOldestScore =
    Array.isArray(minuteEntries) && minuteEntries.length > 0
      ? (minuteEntries[0] as { score: number | string }).score
      : undefined;
  const oldestScore = typeof rawOldestScore === 'number' ? rawOldestScore : Number(rawOldestScore);

  const minuteLimit = Math.min(params.burst, params.limit);
  const remaining = Math.max(0, params.limit - hourCount);
  const hourExceeded = hourCount > params.limit;
  const minuteExceeded = minuteCount > minuteLimit;
  const allowed = !hourExceeded && !minuteExceeded;
  const hourResetSeconds = hourTtl > 0 ? hourTtl : HOUR_SECONDS;
  const minuteResetSeconds = Number.isFinite(oldestScore)
    ? Math.max(1, Math.ceil((oldestScore + MINUTE_SECONDS * 1000 - now) / 1000))
    : MINUTE_SECONDS;
  const limitingResetSeconds = hourExceeded ? hourResetSeconds : minuteResetSeconds;
  const resetSeconds = allowed ? hourResetSeconds : limitingResetSeconds;
  const retryAfterSeconds = allowed ? undefined : limitingResetSeconds;
  const reset = Math.floor((Date.now() + resetSeconds * 1000) / 1000);

  return {
    allowed,
    limit: params.limit,
    remaining,
    reset,
    retryAfterSeconds,
  };
};
