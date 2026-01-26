import { afterEach, describe, expect, it, vi } from 'vitest';

const loadPendingHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/payouts/pending/route');
};

const loadConfirmHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/payouts/[id]/confirm/route');
};

const loadGetHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/payouts/[id]/route');
};

const loadFailHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/payouts/[id]/fail/route');
};

const mockAuth = () => {
  vi.doMock('@/lib/api/handler', () => ({
    enforceApiAuth: vi.fn(async () => ({
      ok: true,
      context: {
        requestId: 'req-3',
        apiKey: { id: 'api-key-3', rateLimit: 1000, partnerName: 'Partner' },
        rateLimitHeaders: new Headers(),
      },
    })),
  }));
};

afterEach(() => {
  vi.unmock('@/lib/api/handler');
  vi.unmock('@/lib/db/api-queries');
  vi.unmock('@/lib/db/queries');
  vi.unmock('@/lib/payouts/service');
  vi.resetModules();
});

describe('GET /api/v1/payouts/pending', () => {
  it('returns pending payouts', async () => {
    mockAuth();

    const listPendingPayoutsForApi = vi.fn(async () => [
      {
        id: 'payout-1',
        dreamBoardId: 'board-1',
        type: 'takealot_gift_card',
        grossCents: 20000,
        feeCents: 0,
        netCents: 20000,
        recipientData: { email: 'parent@example.com', productUrl: 'https://takealot.com' },
        status: 'pending',
        externalRef: null,
        errorMessage: null,
        createdAt: new Date('2026-01-10T10:00:00.000Z'),
        completedAt: null,
      },
      {
        id: 'payout-2',
        dreamBoardId: 'board-2',
        type: 'philanthropy_donation',
        grossCents: 15000,
        feeCents: 0,
        netCents: 15000,
        recipientData: { email: 'parent@example.com' },
        status: 'pending',
        externalRef: null,
        errorMessage: null,
        createdAt: new Date('2026-01-09T10:00:00.000Z'),
        completedAt: null,
      },
    ]);
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/api-queries', () => ({ listPendingPayoutsForApi }));
    vi.doMock('@/lib/db/queries', () => ({ markApiKeyUsed }));

    const { GET } = await loadPendingHandler();
    const response = await GET(new Request('http://localhost/api/v1/payouts/pending?limit=1'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.pagination.has_more).toBe(true);
    expect(markApiKeyUsed).toHaveBeenCalledWith('api-key-3');
  });
});

describe('POST /api/v1/payouts/[id]/confirm', () => {
  it('confirms a payout', async () => {
    mockAuth();

    const completePayout = vi.fn(async () => undefined);
    const getPayoutForApi = vi.fn(async () => ({
      id: '00000000-0000-4000-8000-000000000000',
      dreamBoardId: 'board-1',
      type: 'takealot_gift_card',
      grossCents: 20000,
      feeCents: 0,
      netCents: 20000,
      recipientData: { email: 'parent@example.com' },
      status: 'completed',
      externalRef: 'TKL_123',
      errorMessage: null,
      createdAt: new Date('2026-01-10T10:00:00.000Z'),
      completedAt: new Date('2026-01-11T10:00:00.000Z'),
    }));
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/payouts/service', () => ({ completePayout }));
    vi.doMock('@/lib/db/api-queries', () => ({ getPayoutForApi }));
    vi.doMock('@/lib/db/queries', () => ({ markApiKeyUsed }));

    const { POST } = await loadConfirmHandler();
    const response = await POST(
      new Request('http://localhost/api/v1/payouts/00000000-0000-4000-8000-000000000000/confirm', {
        method: 'POST',
        body: JSON.stringify({ external_ref: 'TKL_123' }),
      }),
      { params: { id: '00000000-0000-4000-8000-000000000000' } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.external_ref).toBe('TKL_123');
    expect(markApiKeyUsed).toHaveBeenCalledWith('api-key-3');
  });
});

describe('GET /api/v1/payouts/[id]', () => {
  it('returns a payout', async () => {
    mockAuth();

    const getPayoutForApi = vi.fn(async () => ({
      id: '00000000-0000-4000-8000-000000000000',
      dreamBoardId: 'board-1',
      type: 'takealot_gift_card',
      grossCents: 20000,
      feeCents: 0,
      netCents: 20000,
      recipientData: { email: 'parent@example.com' },
      status: 'pending',
      externalRef: null,
      errorMessage: null,
      createdAt: new Date('2026-01-10T10:00:00.000Z'),
      completedAt: null,
    }));
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/api-queries', () => ({ getPayoutForApi }));
    vi.doMock('@/lib/db/queries', () => ({ markApiKeyUsed }));

    const { GET } = await loadGetHandler();
    const response = await GET(
      new Request('http://localhost/api/v1/payouts/00000000-0000-4000-8000-000000000000'),
      { params: { id: '00000000-0000-4000-8000-000000000000' } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe('00000000-0000-4000-8000-000000000000');
    expect(markApiKeyUsed).toHaveBeenCalledWith('api-key-3');
  });
});

describe('POST /api/v1/payouts/[id]/fail', () => {
  it('fails a payout', async () => {
    mockAuth();

    const failPayout = vi.fn(async () => undefined);
    const getPayoutForApi = vi.fn(async () => ({
      id: '00000000-0000-4000-8000-000000000000',
      dreamBoardId: 'board-1',
      type: 'takealot_gift_card',
      grossCents: 20000,
      feeCents: 0,
      netCents: 20000,
      recipientData: { email: 'parent@example.com' },
      status: 'failed',
      externalRef: null,
      errorMessage: 'declined',
      createdAt: new Date('2026-01-10T10:00:00.000Z'),
      completedAt: null,
    }));
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/payouts/service', () => ({ failPayout }));
    vi.doMock('@/lib/db/api-queries', () => ({ getPayoutForApi }));
    vi.doMock('@/lib/db/queries', () => ({ markApiKeyUsed }));

    const { POST } = await loadFailHandler();
    const response = await POST(
      new Request('http://localhost/api/v1/payouts/00000000-0000-4000-8000-000000000000/fail', {
        method: 'POST',
        body: JSON.stringify({ error_message: 'declined' }),
      }),
      { params: { id: '00000000-0000-4000-8000-000000000000' } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('failed');
    expect(markApiKeyUsed).toHaveBeenCalledWith('api-key-3');
  });
});
