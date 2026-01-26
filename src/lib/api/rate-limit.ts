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

  const [hourCount, minuteCount] = await Promise.all([kv.incr(hourKey), kv.incr(minuteKey)]);

  await Promise.all([
    kv.expire(hourKey, HOUR_SECONDS, 'NX'),
    kv.expire(minuteKey, MINUTE_SECONDS, 'NX'),
  ]);

  const [hourTtl, minuteTtl] = await Promise.all([kv.ttl(hourKey), kv.ttl(minuteKey)]);
  const remaining = Math.max(0, params.limit - hourCount);
  const hourExceeded = hourCount > params.limit;
  const minuteExceeded = minuteCount > params.burst;
  const allowed = !hourExceeded && !minuteExceeded;
  const hourResetSeconds = hourTtl > 0 ? hourTtl : HOUR_SECONDS;
  const minuteResetSeconds = minuteTtl > 0 ? minuteTtl : MINUTE_SECONDS;
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
