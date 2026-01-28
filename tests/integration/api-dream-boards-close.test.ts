import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/dream-boards/[id]/close/route');
};

const mockAuth = () => {
  vi.doMock('@/lib/api/handler', () => ({
    enforceApiAuth: vi.fn(async () => ({
      ok: true,
      context: {
        requestId: 'req-close',
        apiKey: { id: 'api-key-1', partnerId: 'partner-1', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    })),
  }));
};

const buildBoard = (overrides: Record<string, unknown> = {}) => ({
  id: 'board-1',
  slug: 'maya-birthday',
  childName: 'Maya',
  childPhotoUrl: 'https://images.example/photo.jpg',
  birthdayDate: new Date('2026-02-15T00:00:00.000Z'),
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
  deadline: new Date('2026-02-14T12:00:00.000Z'),
  status: 'active',
  createdAt: new Date('2026-01-10T10:00:00.000Z'),
  updatedAt: new Date('2026-01-11T11:00:00.000Z'),
  raisedCents: 5000,
  contributionCount: 2,
  ...overrides,
});

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
  vi.unmock('@/lib/audit');
  vi.unmock('@/lib/db');
  vi.unmock('@/lib/db/queries');
  vi.unmock('@/lib/payouts/queries');
  vi.unmock('@/lib/payouts/service');
  vi.resetModules();
});

describe('POST /api/v1/dream-boards/[id]/close', () => {
  it('closes a board and records the reason', async () => {
    mockAuth();
    const update = mockDb();

    const board = buildBoard({ status: 'active' });
    const closed = buildBoard({ status: 'closed' });
    const getDreamBoardByPublicId = vi
      .fn()
      .mockResolvedValueOnce(board)
      .mockResolvedValueOnce(closed);

    const recordAuditEvent = vi.fn(async () => undefined);
    const createPayoutsForDreamBoard = vi.fn(async () => ({ created: [] }));

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId,
      markApiKeyUsed: vi.fn(async () => undefined),
    }));
    vi.doMock('@/lib/payouts/queries', () => ({
      listPayoutsForDreamBoard: vi.fn(async () => []),
    }));
    vi.doMock('@/lib/payouts/service', () => ({ createPayoutsForDreamBoard }));
    vi.doMock('@/lib/audit', () => ({ recordAuditEvent }));

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/v1/dream-boards/board-1/close', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'manual' }),
      }),
      { params: { id: 'board-1' } }
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalled();
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'dreamboard.closed',
        metadata: { reason: 'manual', previousStatus: 'active' },
      })
    );
    expect(createPayoutsForDreamBoard).toHaveBeenCalled();
  });

  it('rejects closing draft boards', async () => {
    mockAuth();
    mockDb();

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId: vi.fn(async () => buildBoard({ status: 'draft' })),
      markApiKeyUsed: vi.fn(async () => undefined),
    }));
    vi.doMock('@/lib/payouts/service', () => ({
      createPayoutsForDreamBoard: vi.fn(async () => ({ created: [] })),
    }));
    vi.doMock('@/lib/payouts/queries', () => ({
      listPayoutsForDreamBoard: vi.fn(async () => []),
    }));

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/v1/dream-boards/board-1/close', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'manual' }),
      }),
      { params: { id: 'board-1' } }
    );

    expect(response.status).toBe(409);
  });

  it('is idempotent when the board is already closed', async () => {
    mockAuth();
    const update = mockDb();
    const recordAuditEvent = vi.fn(async () => undefined);
    const createPayoutsForDreamBoard = vi.fn(async () => ({ created: [] }));

    const closed = buildBoard({ status: 'closed' });
    const getDreamBoardByPublicId = vi
      .fn()
      .mockResolvedValueOnce(closed)
      .mockResolvedValueOnce(closed);

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId,
      markApiKeyUsed: vi.fn(async () => undefined),
    }));
    vi.doMock('@/lib/payouts/queries', () => ({
      listPayoutsForDreamBoard: vi.fn(async () => []),
    }));
    vi.doMock('@/lib/payouts/service', () => ({ createPayoutsForDreamBoard }));
    vi.doMock('@/lib/audit', () => ({ recordAuditEvent }));

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/v1/dream-boards/board-1/close', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'manual' }),
      }),
      { params: { id: 'board-1' } }
    );

    expect(response.status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
    expect(createPayoutsForDreamBoard).toHaveBeenCalled();
  });
});
