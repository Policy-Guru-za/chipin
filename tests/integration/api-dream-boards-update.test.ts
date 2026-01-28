import { afterEach, describe, expect, it, vi } from 'vitest';

const DAY_MS = 24 * 60 * 60 * 1000;

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/dream-boards/[id]/route');
};

const mockAuth = () => {
  vi.doMock('@/lib/api/handler', () => ({
    enforceApiAuth: vi.fn(async () => ({
      ok: true,
      context: {
        requestId: 'req-123',
        apiKey: { id: 'api-key-1', partnerId: 'partner-1', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    })),
  }));
};

const buildBoard = (overrides: Record<string, unknown> = {}) => {
  const now = Date.now();
  return {
    id: 'board-1',
    slug: 'maya-birthday',
    childName: 'Maya',
    childPhotoUrl: 'https://images.example/photo.jpg',
    birthdayDate: new Date(now + 10 * DAY_MS),
    giftType: 'takealot_product',
    giftData: {
      type: 'takealot_product',
      productUrl: 'https://takealot.com/product',
      productName: 'Train set',
      productImage: 'https://images.example/product.jpg',
      productPrice: 35000,
    },
    overflowGiftData: {
      causeId: 'food-forward',
      causeName: 'Feed Hungry Children',
      impactDescription: 'Feed a class',
    },
    goalCents: 35000,
    payoutMethod: 'takealot_gift_card',
    message: 'Make it happen',
    deadline: new Date(now + 10 * DAY_MS),
    status: 'active',
    createdAt: new Date(now - DAY_MS),
    updatedAt: new Date(now - DAY_MS / 2),
    raisedCents: 5000,
    contributionCount: 2,
    ...overrides,
  };
};

const mockDb = () => {
  const update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(async () => undefined),
    })),
  }));

  vi.doMock('@/lib/db', () => ({ db: { update } }));
  return update;
};

afterEach(() => {
  vi.unmock('@/lib/api/handler');
  vi.unmock('@/lib/db');
  vi.unmock('@/lib/db/queries');
  vi.resetModules();
});

describe('PATCH /api/v1/dream-boards/[id]', () => {
  it('rejects invalid status transitions', async () => {
    mockAuth();
    const update = mockDb();

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId: vi.fn(async () => buildBoard()),
      markApiKeyUsed: vi.fn(async () => undefined),
    }));

    const { PATCH } = await loadHandler();
    const response = await PATCH(
      new Request('http://localhost/api/v1/dream-boards/board-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'paid_out' }),
      }),
      { params: { id: 'board-1' } }
    );

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects deadlines that are not extensions', async () => {
    mockAuth();
    const update = mockDb();
    const now = Date.now();
    const board = buildBoard({ deadline: new Date(now + 10 * DAY_MS) });

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId: vi.fn(async () => board),
      markApiKeyUsed: vi.fn(async () => undefined),
    }));

    const { PATCH } = await loadHandler();
    const response = await PATCH(
      new Request('http://localhost/api/v1/dream-boards/board-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deadline: new Date(now + 5 * DAY_MS).toISOString() }),
      }),
      { params: { id: 'board-1' } }
    );

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it('updates message fields successfully', async () => {
    mockAuth();
    const update = mockDb();
    const updatedBoard = buildBoard({ message: 'Updated message' });
    const getDreamBoardByPublicId = vi
      .fn()
      .mockResolvedValueOnce(buildBoard())
      .mockResolvedValueOnce(updatedBoard);

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId,
      markApiKeyUsed: vi.fn(async () => undefined),
    }));

    const { PATCH } = await loadHandler();
    const response = await PATCH(
      new Request('http://localhost/api/v1/dream-boards/board-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Updated message' }),
      }),
      { params: { id: 'board-1' } }
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.message).toBe('Updated message');
    expect(update).toHaveBeenCalled();
  });
});
