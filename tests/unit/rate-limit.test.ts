import { beforeEach, describe, expect, it, vi } from 'vitest';

const kvMock = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
}));

vi.mock('@vercel/kv', () => ({
  kv: kvMock,
}));

import { enforceRateLimit } from '../../src/lib/auth/rate-limit';

describe('enforceRateLimit', () => {
  beforeEach(() => {
    kvMock.incr.mockReset();
    kvMock.expire.mockReset();
    kvMock.ttl.mockReset();
  });

  it('allows first request and sets expiry', async () => {
    kvMock.incr.mockResolvedValueOnce(1);
    kvMock.expire.mockResolvedValueOnce(true);

    const result = await enforceRateLimit('key', { limit: 2, windowSeconds: 60 });

    expect(result).toEqual({ allowed: true });
    expect(kvMock.expire).toHaveBeenCalledWith('key', 60);
  });

  it('blocks when limit exceeded and returns retry ttl', async () => {
    kvMock.incr.mockResolvedValueOnce(3);
    kvMock.ttl.mockResolvedValueOnce(120);

    const result = await enforceRateLimit('key', { limit: 2, windowSeconds: 60 });

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 120 });
  });
});
