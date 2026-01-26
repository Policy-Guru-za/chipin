import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/dream-boards/[id]/route');
};

const mockAuth = (result: { ok: boolean; response?: Response; context?: any }) => {
  vi.doMock('@/lib/api/handler', () => ({
    enforceApiAuth: vi.fn(async () => result),
  }));
};

const baseTakealotBoard = {
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

const buildTakealotBoard = (overrides: Partial<typeof baseTakealotBoard> = {}) => ({
  ...baseTakealotBoard,
  ...overrides,
});

afterEach(() => {
  vi.unmock('@/lib/api/handler');
  vi.unmock('@/lib/db/queries');
  vi.resetModules();
});

describe('GET /api/v1/dream-boards/[id] auth', () => {
  it('returns unauthorized when auth fails', async () => {
    mockAuth({
      ok: false,
      response: new Response(JSON.stringify({ error: { code: 'unauthorized' } }), { status: 401 }),
    });

    const { GET } = await loadHandler();
    const response = await GET(new Request('http://localhost/api/v1/dream-boards/demo'), {
      params: { id: 'demo' },
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe('unauthorized');
  });

  it('tracks forbidden requests separately', async () => {
    mockAuth({
      ok: false,
      response: new Response(JSON.stringify({ error: { code: 'forbidden' } }), { status: 403 }),
    });

    const { GET } = await loadHandler();
    const response = await GET(new Request('http://localhost/api/v1/dream-boards/demo'), {
      params: { id: 'demo' },
    });

    expect(response.status).toBe(403);
  });
});

describe('GET /api/v1/dream-boards/[id] responses - missing', () => {
  it('returns not found when dream board is missing', async () => {
    mockAuth({
      ok: true,
      context: {
        requestId: 'req-1',
        apiKey: { id: 'api-key-1', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    });

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId: vi.fn(async () => null),
      markApiKeyUsed: vi.fn(async () => undefined),
    }));

    const { GET } = await loadHandler();
    const response = await GET(new Request('http://localhost/api/v1/dream-boards/demo'), {
      params: { id: 'demo' },
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe('not_found');
  });
});

describe('GET /api/v1/dream-boards/[id] responses - validation', () => {
  it('returns validation error for invalid identifiers', async () => {
    mockAuth({
      ok: true,
      context: {
        requestId: 'req-2',
        apiKey: { id: 'api-key-1', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    });

    const getDreamBoardByPublicId = vi.fn(async () => null);
    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId,
      markApiKeyUsed: vi.fn(async () => undefined),
    }));

    const { GET } = await loadHandler();
    const response = await GET(new Request('http://localhost/api/v1/dream-boards/bad/id'), {
      params: { id: 'bad/id' },
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('validation_error');
    expect(getDreamBoardByPublicId).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/dream-boards/[id] responses - payloads', () => {
  it('returns a serialized dream board payload', async () => {
    mockAuth({
      ok: true,
      context: {
        requestId: 'req-123',
        apiKey: { id: 'api-key-2', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    });

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId: vi.fn(async () => buildTakealotBoard()),
      markApiKeyUsed: vi.fn(async () => undefined),
    }));

    const { GET } = await loadHandler();
    const response = await GET(
      new Request('http://localhost/api/v1/dream-boards/maya-birthday', {
        headers: { 'x-request-id': 'req-123' },
      }),
      { params: { id: 'maya-birthday' } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.child_name).toBe('Maya');
    expect(payload.data.gift_data.product_url).toBe('https://takealot.com/product');
    expect(payload.data.display_mode).toBe('gift');
    expect(payload.meta.request_id).toBe('req-123');
  });

  it('returns takealot payloads when overflow data is missing', async () => {
    mockAuth({
      ok: true,
      context: {
        requestId: 'req-5',
        apiKey: { id: 'api-key-5', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    });

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId: vi.fn(async () =>
        buildTakealotBoard({
          id: 'board-3',
          slug: 'legacy-board',
          childName: 'Lebo',
          overflowGiftData: null,
        })
      ),
      markApiKeyUsed: vi.fn(async () => undefined),
    }));

    const { GET } = await loadHandler();
    const response = await GET(new Request('http://localhost/api/v1/dream-boards/legacy-board'), {
      params: { id: 'legacy-board' },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.overflow_gift_data).toBeNull();
    expect(payload.data.display_mode).toBe('gift');
  });

  it('returns philanthropy gift data without extra fields', async () => {
    mockAuth({
      ok: true,
      context: {
        requestId: 'req-4',
        apiKey: { id: 'api-key-4', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    });

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId: vi.fn(async () => ({
        id: 'board-2',
        slug: 'seedlings',
        childName: 'Maya',
        childPhotoUrl: 'https://images.example/photo.jpg',
        birthdayDate: new Date('2026-02-15T00:00:00.000Z'),
        giftType: 'philanthropy',
        giftData: {
          type: 'philanthropy',
          causeId: 'plant-trees',
          causeName: 'Plant Trees',
          causeDescription: 'Plant indigenous trees across South Africa',
          causeImage: 'https://images.example/trees.jpg',
          impactDescription: 'Plant 10 trees',
          amountCents: 25000,
        },
        overflowGiftData: null,
        goalCents: 25000,
        payoutMethod: 'philanthropy_donation',
        message: null,
        deadline: new Date('2026-02-14T12:00:00.000Z'),
        status: 'active',
        createdAt: new Date('2026-01-10T10:00:00.000Z'),
        updatedAt: new Date('2026-01-11T11:00:00.000Z'),
        raisedCents: 5000,
        contributionCount: 2,
      })),
      markApiKeyUsed: vi.fn(async () => undefined),
    }));

    const { GET } = await loadHandler();
    const response = await GET(new Request('http://localhost/api/v1/dream-boards/seedlings'), {
      params: { id: 'seedlings' },
    });
    const payload = await response.json();

    expect(payload.data.gift_data).toEqual({
      cause_id: 'plant-trees',
      cause_name: 'Plant Trees',
      impact_description: 'Plant 10 trees',
      amount_cents: 25000,
    });
  });
});

describe('GET /api/v1/dream-boards/[id] rate limits', () => {
  it('returns a rate limit error when throttled', async () => {
    mockAuth({
      ok: false,
      response: new Response(JSON.stringify({ error: { code: 'rate_limited' } }), {
        status: 429,
        headers: new Headers({ 'Retry-After': '120' }),
      }),
    });

    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardByPublicId: vi.fn(async () => null),
      markApiKeyUsed: vi.fn(async () => undefined),
    }));

    const { GET } = await loadHandler();
    const response = await GET(new Request('http://localhost/api/v1/dream-boards/demo'), {
      params: { id: 'demo' },
    });
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.error.code).toBe('rate_limited');
    expect(response.headers.get('Retry-After')).toBe('120');
  });
});
