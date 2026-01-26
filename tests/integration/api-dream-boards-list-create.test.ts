import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/dream-boards/route');
};

const mockAuth = () => {
  vi.doMock('@/lib/api/handler', () => ({
    enforceApiAuth: vi.fn(async () => ({
      ok: true,
      context: {
        requestId: 'req-1',
        apiKey: { id: 'api-key-1', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    })),
  }));
};

const baseBoard = {
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
};

afterEach(() => {
  vi.unmock('@/lib/api/handler');
  vi.unmock('@/lib/db/api-queries');
  vi.unmock('@/lib/db/queries');
  vi.unmock('@/lib/db');
  vi.unmock('@/lib/utils/slug');
  vi.resetModules();
});

describe('GET /api/v1/dream-boards', () => {
  it('returns paginated dream boards', async () => {
    mockAuth();

    const listDreamBoardsForApi = vi.fn(async () => [
      baseBoard,
      { ...baseBoard, id: 'board-2', slug: 'luka-birthday' },
    ]);
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/api-queries', () => ({ listDreamBoardsForApi }));
    vi.doMock('@/lib/db/queries', () => ({
      ensureHostForEmail: vi.fn(async () => ({ id: 'host-1' })),
      markApiKeyUsed,
    }));

    const { GET } = await loadHandler();
    const response = await GET(new Request('http://localhost/api/v1/dream-boards?limit=1'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.pagination.has_more).toBe(true);
    expect(payload.pagination.next_cursor).toBeTruthy();
    expect(markApiKeyUsed).toHaveBeenCalledWith('api-key-1');
  });
});

describe('POST /api/v1/dream-boards', () => {
  it('creates a dream board', async () => {
    mockAuth();

    const markApiKeyUsed = vi.fn(async () => undefined);
    vi.doMock('@/lib/db/queries', () => ({
      ensureHostForEmail: vi.fn(async () => ({ id: 'host-1' })),
      markApiKeyUsed,
    }));

    vi.doMock('@/lib/utils/slug', () => ({ generateSlug: () => 'maya-birthday-abc123' }));

    const returning = vi.fn(async () => [
      { id: 'board-1', slug: 'maya-birthday-abc123', createdAt: new Date(), updatedAt: new Date() },
    ]);
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const insert = vi.fn(() => ({ values }));

    vi.doMock('@/lib/db', () => ({ db: { insert } }));

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/v1/dream-boards', {
        method: 'POST',
        body: JSON.stringify({
          child_name: 'Maya',
          child_photo_url: 'https://images.example/photo.jpg',
          birthday_date: new Date().toISOString().split('T')[0],
          gift_type: 'takealot_product',
          gift_data: {
            product_url: 'https://takealot.com/product',
            product_name: 'Train set',
            product_image: 'https://images.example/product.jpg',
            product_price: 35000,
          },
          payout_method: 'takealot_gift_card',
          overflow_gift_data: {
            cause_id: 'food-forward',
            cause_name: 'Feed Hungry Children',
            impact_description: 'Feed a class',
          },
          goal_cents: 35000,
          payout_email: 'parent@example.com',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.slug).toBe('maya-birthday-abc123');
    expect(markApiKeyUsed).toHaveBeenCalledWith('api-key-1');
    expect(insert).toHaveBeenCalled();
  });
});
