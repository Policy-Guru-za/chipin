import { afterEach, describe, expect, it, vi } from 'vitest';

const loadListHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/dream-boards/[id]/contributions/route');
};

const loadGetHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/contributions/[id]/route');
};

const mockAuth = () => {
  vi.doMock('@/lib/api/handler', () => ({
    enforceApiAuth: vi.fn(async () => ({
      ok: true,
      context: {
        requestId: 'req-2',
        apiKey: { id: 'api-key-2', partnerId: 'partner-1', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    })),
  }));
};

afterEach(() => {
  vi.unmock('@/lib/api/handler');
  vi.unmock('@/lib/db/api-queries');
  vi.unmock('@/lib/db/queries');
  vi.resetModules();
});

describe('GET /api/v1/dream-boards/[id]/contributions', () => {
  it('returns paginated contributions', async () => {
    mockAuth();

    const listContributionsForApi = vi.fn(async () => [
      {
        id: 'contrib-1',
        dreamBoardId: 'board-1',
        contributorName: 'Lebo',
        message: 'Happy birthday',
        amountCents: 20000,
        feeCents: 600,
        netCents: 19400,
        paymentStatus: 'completed',
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      },
      {
        id: 'contrib-2',
        dreamBoardId: 'board-1',
        contributorName: 'Sam',
        message: null,
        amountCents: 30000,
        feeCents: 900,
        netCents: 29100,
        paymentStatus: 'completed',
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      },
    ]);
    const getDreamBoardByPublicId = vi.fn(async () => ({ id: 'board-1' }));
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/api-queries', () => ({ listContributionsForApi }));
    vi.doMock('@/lib/db/queries', () => ({ getDreamBoardByPublicId, markApiKeyUsed }));

    const { GET } = await loadListHandler();
    const response = await GET(
      new Request('http://localhost/api/v1/dream-boards/board-1/contributions?limit=1'),
      { params: { id: 'board-1' } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.pagination.has_more).toBe(true);
    expect(listContributionsForApi).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId: 'partner-1', dreamBoardId: 'board-1' })
    );
    expect(markApiKeyUsed).toHaveBeenCalledWith('api-key-2');
  });
});

describe('GET /api/v1/contributions/[id]', () => {
  it('returns not found when missing', async () => {
    mockAuth();

    const getContributionForApi = vi.fn(async () => null);
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/api-queries', () => ({ getContributionForApi }));
    vi.doMock('@/lib/db/queries', () => ({ markApiKeyUsed }));

    const { GET } = await loadGetHandler();
    const response = await GET(new Request('http://localhost/api/v1/contributions/bad-id'), {
      params: { id: 'bad-id' },
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('validation_error');
  });

  it('returns not found when contribution belongs to another partner', async () => {
    mockAuth();

    const getContributionForApi = vi.fn(async () => null);
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/api-queries', () => ({ getContributionForApi }));
    vi.doMock('@/lib/db/queries', () => ({ markApiKeyUsed }));

    const { GET } = await loadGetHandler();
    const id = '00000000-0000-4000-8000-000000000000';
    const response = await GET(new Request(`http://localhost/api/v1/contributions/${id}`), {
      params: { id },
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe('not_found');
    expect(getContributionForApi).toHaveBeenCalledWith({
      id,
      partnerId: 'partner-1',
    });
  });
});
