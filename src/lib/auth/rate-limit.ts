import { kv } from '@vercel/kv';

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export async function enforceRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const count = await kv.incr(key);

  if (count === 1) {
    await kv.expire(key, config.windowSeconds);
  }

  if (count > config.limit) {
    const ttl = await kv.ttl(key);
    return {
      allowed: false,
      retryAfterSeconds: ttl > 0 ? ttl : config.windowSeconds,
    };
  }

  return { allowed: true };
}
