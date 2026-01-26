import { afterEach, describe, expect, it, vi } from 'vitest';

const token = ['cpk', 'test', '0123456789abcdef0123456789abcdef'].join('_');

const loadModule = async () => {
  vi.resetModules();
  return import('@/lib/api/auth');
};

describe('requireApiKey', () => {
  afterEach(() => {
    vi.unmock('@/lib/db/queries');
    vi.resetModules();
  });

  it('rejects missing authorization header', async () => {
    vi.doMock('@/lib/db/queries', () => ({ getApiKeyByHash: vi.fn() }));
    const { requireApiKey } = await loadModule();

    const result = await requireApiKey(null, 'dreamboards:read');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unauthorized');
    }
  });

  it('parses API key prefixes with trailing underscore', async () => {
    vi.doMock('@/lib/db/queries', () => ({ getApiKeyByHash: vi.fn() }));
    const { parseApiKey } = await loadModule();

    const parsed = parseApiKey(`Bearer ${token}`);

    expect(parsed?.prefix).toBe('cpk_test_');
  });

  it('rejects when scope is missing', async () => {
    const getApiKeyByHash = vi.fn(async () => ({
      id: 'api-key-1',
      partnerName: 'Partner',
      scopes: ['contributions:read'],
      rateLimit: 1000,
      isActive: true,
    }));

    vi.doMock('@/lib/db/queries', () => ({ getApiKeyByHash }));
    const { requireApiKey } = await loadModule();

    const result = await requireApiKey(`Bearer ${token}`, 'dreamboards:read');

    expect(getApiKeyByHash).toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('forbidden');
    }
  });

  it('accepts normalized dream board scope', async () => {
    const getApiKeyByHash = vi.fn(async () => ({
      id: 'api-key-2',
      partnerName: 'Partner',
      scopes: ['dream_boards:read'],
      rateLimit: 1000,
      isActive: true,
    }));

    vi.doMock('@/lib/db/queries', () => ({ getApiKeyByHash }));
    const { requireApiKey } = await loadModule();

    const result = await requireApiKey(`Bearer ${token}`, 'dreamboards:read');

    expect(result.ok).toBe(true);
  });
});
