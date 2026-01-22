import { afterEach, describe, expect, it, vi } from 'vitest';

const kvGet = vi.fn();

vi.mock('@vercel/kv', () => ({
  kv: {
    get: kvGet,
    set: vi.fn(),
  },
}));

const loadModule = async () => {
  vi.resetModules();
  return import('@/lib/payments/ozow');
};

describe('listOzowTransactionsPaged', () => {
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
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('paginates until the final short page', async () => {
    process.env.OZOW_CLIENT_ID = 'client';
    process.env.OZOW_CLIENT_SECRET = 'secret';
    process.env.OZOW_BASE_URL = 'https://one.ozow.com/v1';
    kvGet.mockResolvedValue('cached-token');

    const fetchMock = vi.fn(async (input) => {
      const url = new URL(String(input));
      const offset = url.searchParams.get('offset');
      if (offset === '0') {
        return {
          ok: true,
          json: async () => ({
            data: [{ merchantReference: 'ref-1' }, { merchantReference: 'ref-2' }],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          data: [{ merchantReference: 'ref-3' }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const { listOzowTransactionsPaged } = await loadModule();
    const result = await listOzowTransactionsPaged({
      fromDate: '2026-01-22T08:00:00.000Z',
      toDate: '2026-01-22T10:00:00.000Z',
      limit: 2,
      maxPages: 3,
    });

    expect(result.pagingComplete).toBe(true);
    expect(result.pagesFetched).toBe(2);
    expect(result.transactions).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('flags incomplete pagination when max pages reached', async () => {
    process.env.OZOW_CLIENT_ID = 'client';
    process.env.OZOW_CLIENT_SECRET = 'secret';
    process.env.OZOW_BASE_URL = 'https://one.ozow.com/v1';
    kvGet.mockResolvedValue('cached-token');

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ merchantReference: 'ref-1' }, { merchantReference: 'ref-2' }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { listOzowTransactionsPaged } = await loadModule();
    const result = await listOzowTransactionsPaged({
      fromDate: '2026-01-22T08:00:00.000Z',
      toDate: '2026-01-22T10:00:00.000Z',
      limit: 2,
      maxPages: 1,
    });

    expect(result.pagingComplete).toBe(false);
    expect(result.pagesFetched).toBe(1);
    expect(result.transactions).toHaveLength(2);
  });
});
