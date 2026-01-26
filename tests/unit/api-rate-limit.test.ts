import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const kvMock = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
}));

vi.mock('@vercel/kv', () => ({
  kv: kvMock,
}));

import { enforceApiRateLimit } from '@/lib/api/rate-limit';

describe('enforceApiRateLimit', () => {
  beforeEach(() => {
    kvMock.incr.mockReset();
    kvMock.expire.mockReset();
    kvMock.ttl.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-26T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses minute reset when burst limit exceeded', async () => {
    kvMock.incr.mockResolvedValueOnce(100).mockResolvedValueOnce(101);
    kvMock.ttl.mockResolvedValueOnce(3600).mockResolvedValueOnce(60);

    const result = await enforceApiRateLimit({ keyId: 'anon', limit: 1000, burst: 100 });

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(60);
    expect(result.reset).toBe(Math.floor((Date.now() + 60 * 1000) / 1000));
    expect(kvMock.expire).toHaveBeenCalledWith('rate:api:anon:hour', 3600, 'NX');
    expect(kvMock.expire).toHaveBeenCalledWith('rate:api:anon:minute', 60, 'NX');
  });

  it('uses hour reset when hourly limit exceeded', async () => {
    kvMock.incr.mockResolvedValueOnce(1001).mockResolvedValueOnce(10);
    kvMock.ttl.mockResolvedValueOnce(3600).mockResolvedValueOnce(60);

    const result = await enforceApiRateLimit({ keyId: 'anon', limit: 1000, burst: 100 });

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(3600);
    expect(result.reset).toBe(Math.floor((Date.now() + 3600 * 1000) / 1000));
    expect(kvMock.expire).toHaveBeenCalledWith('rate:api:anon:hour', 3600, 'NX');
    expect(kvMock.expire).toHaveBeenCalledWith('rate:api:anon:minute', 60, 'NX');
  });
});
