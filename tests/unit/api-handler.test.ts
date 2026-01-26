import type { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const loadModule = async () => {
  vi.resetModules();
  return import('@/lib/api/handler');
};

const mockApiKey = (rateLimit: number) => ({
  id: 'api-key-1',
  partnerId: 'partner-1',
  partnerName: 'Partner',
  scopes: ['dreamboards:read'],
  rateLimit,
  isActive: true,
});

const mockPartnerKey = (id: string, partnerId: string, rateLimit: number) => ({
  id,
  partnerId,
  partnerName: 'Partner',
  scopes: ['dreamboards:read'],
  rateLimit,
  isActive: true,
});

afterEach(() => {
  vi.unmock('@/lib/api/auth');
  vi.unmock('@/lib/api/rate-limit');
  vi.resetModules();
});

describe('enforceApiAuth', () => {
  it('skips rate limiting when rateLimit is unlimited', async () => {
    const enforceApiRateLimit = vi.fn();

    vi.doMock('@/lib/api/auth', () => ({
      requireApiKey: vi.fn(async () => ({ ok: true, apiKey: mockApiKey(0) })),
    }));
    vi.doMock('@/lib/api/rate-limit', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/api/rate-limit')>('@/lib/api/rate-limit');
      return {
        ...actual,
        enforceApiRateLimit,
      };
    });

    const { enforceApiAuth } = await loadModule();
    const result = await enforceApiAuth(
      new Request('http://localhost') as NextRequest,
      'dreamboards:read'
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.rateLimitHeaders.get('X-RateLimit-Limit')).toBeNull();
    }
    expect(enforceApiRateLimit).not.toHaveBeenCalled();
  });

  it('applies rate limiting when rateLimit is set', async () => {
    const enforceApiRateLimit = vi.fn(async () => ({
      allowed: true,
      limit: 1000,
      remaining: 999,
      reset: 1700000000,
    }));

    vi.doMock('@/lib/api/auth', () => ({
      requireApiKey: vi.fn(async () => ({ ok: true, apiKey: mockApiKey(1000) })),
    }));
    vi.doMock('@/lib/api/rate-limit', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/api/rate-limit')>('@/lib/api/rate-limit');
      return {
        ...actual,
        enforceApiRateLimit,
      };
    });

    const { enforceApiAuth } = await loadModule();
    const result = await enforceApiAuth(
      new Request('http://localhost') as NextRequest,
      'dreamboards:read'
    );

    expect(result.ok).toBe(true);
    expect(enforceApiRateLimit).toHaveBeenCalled();
  });

  it('scopes rate limiting by partner across api keys', async () => {
    const enforceApiRateLimit = vi.fn(async () => ({
      allowed: true,
      limit: 1000,
      remaining: 999,
      reset: 1700000000,
    }));
    const requireApiKey = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        apiKey: mockPartnerKey('api-key-1', 'partner-1', 1000),
      })
      .mockResolvedValueOnce({
        ok: true,
        apiKey: mockPartnerKey('api-key-2', 'partner-1', 1000),
      });

    vi.doMock('@/lib/api/auth', () => ({
      requireApiKey,
    }));
    vi.doMock('@/lib/api/rate-limit', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/api/rate-limit')>('@/lib/api/rate-limit');
      return {
        ...actual,
        enforceApiRateLimit,
      };
    });

    const { enforceApiAuth } = await loadModule();
    await enforceApiAuth(new Request('http://localhost') as NextRequest, 'dreamboards:read');
    await enforceApiAuth(new Request('http://localhost') as NextRequest, 'dreamboards:read');

    expect(enforceApiRateLimit).toHaveBeenCalledTimes(2);
    expect(enforceApiRateLimit.mock.calls[0]?.[0]?.keyId).toBe('partner:partner-1');
    expect(enforceApiRateLimit.mock.calls[1]?.[0]?.keyId).toBe('partner:partner-1');
  });
});
