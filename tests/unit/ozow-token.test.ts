import { afterEach, describe, expect, it, vi } from 'vitest';

const kvGet = vi.fn();
const kvSet = vi.fn();

vi.mock('@vercel/kv', () => ({
  kv: {
    get: kvGet,
    set: kvSet,
  },
}));

const loadModule = async () => {
  vi.resetModules();
  return import('@/lib/payments/ozow');
};

describe('Ozow access token caching', () => {
  const originalEnv = {
    OZOW_CLIENT_ID: process.env.OZOW_CLIENT_ID,
    OZOW_CLIENT_SECRET: process.env.OZOW_CLIENT_SECRET,
    OZOW_BASE_URL: process.env.OZOW_BASE_URL,
  };

  afterEach(() => {
    process.env.OZOW_CLIENT_ID = originalEnv.OZOW_CLIENT_ID;
    process.env.OZOW_CLIENT_SECRET = originalEnv.OZOW_CLIENT_SECRET;
    process.env.OZOW_BASE_URL = originalEnv.OZOW_BASE_URL;
    kvGet.mockReset();
    kvSet.mockReset();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns cached token when present', async () => {
    process.env.OZOW_CLIENT_ID = 'client';
    process.env.OZOW_CLIENT_SECRET = 'secret';
    process.env.OZOW_BASE_URL = 'https://one.ozow.com/v1';
    kvGet.mockResolvedValue('cached-token');

    const { getOzowAccessToken } = await loadModule();
    const token = await getOzowAccessToken('payment');

    expect(token).toBe('cached-token');
    expect(kvGet).toHaveBeenCalledWith('ozow:token:payment');
  });

  it('fetches and caches token when missing', async () => {
    process.env.OZOW_CLIENT_ID = 'client';
    process.env.OZOW_CLIENT_SECRET = 'secret';
    process.env.OZOW_BASE_URL = 'https://one.ozow.com/v1';
    kvGet.mockResolvedValue(null);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: 'fresh-token', expires_in: 1200 }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { getOzowAccessToken } = await loadModule();
    const token = await getOzowAccessToken('payment');

    expect(token).toBe('fresh-token');
    expect(kvSet).toHaveBeenCalledWith('ozow:token:payment', 'fresh-token', { ex: 1140 });
    expect(fetchMock).toHaveBeenCalled();
  });
});
