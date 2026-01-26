import { afterEach, describe, expect, it, vi } from 'vitest';

const kvMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@vercel/kv', () => ({
  kv: kvMock,
}));

const loadCache = async () => {
  vi.resetModules();
  return import('@/lib/dream-boards/cache');
};

const makeBoard = (overrides: Record<string, unknown> = {}) => ({
  id: 'board-1',
  slug: 'maya-birthday-123',
  childName: 'Maya',
  childPhotoUrl: 'https://example.com/child.jpg',
  birthdayDate: new Date('2026-02-01T00:00:00.000Z'),
  giftType: 'takealot_product',
  giftData: {
    productName: 'Scooter',
    productImage: 'https://example.com/scooter.jpg',
  },
  overflowGiftData: {
    causeId: 'food-forward',
    causeName: 'Feed Hungry Children',
    impactDescription: 'Feed a class',
  },
  goalCents: 5000,
  payoutMethod: 'takealot_gift_card',
  message: 'Let’s do it',
  deadline: new Date('2026-02-05T00:00:00.000Z'),
  status: 'active',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  raisedCents: 1500,
  contributionCount: 2,
  ...overrides,
});

afterEach(() => {
  vi.unmock('@/lib/db/queries');
  vi.clearAllMocks();
  vi.resetModules();
});

describe('getCachedDreamBoardBySlug', () => {
  it('hydrates cached dates on cache hit', async () => {
    const cachedBoard = {
      ...makeBoard(),
      birthdayDate: new Date('2026-02-01T00:00:00.000Z').toISOString(),
      deadline: new Date('2026-02-05T00:00:00.000Z').toISOString(),
      createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-01-02T00:00:00.000Z').toISOString(),
    };

    kvMock.get.mockResolvedValueOnce(cachedBoard);

    const getDreamBoardBySlug = vi.fn(async () => null);
    const getDreamBoardSlugById = vi.fn(async () => null);
    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardBySlug,
      getDreamBoardSlugById,
    }));

    const { getCachedDreamBoardBySlug } = await loadCache();
    const result = await getCachedDreamBoardBySlug('maya-birthday-123');

    expect(getDreamBoardBySlug).not.toHaveBeenCalled();
    expect(result?.deadline).toBeInstanceOf(Date);
    expect(result?.createdAt).toBeInstanceOf(Date);
    expect(result?.updatedAt).toBeInstanceOf(Date);
  });

  it('stores a cache miss and returns the board', async () => {
    const board = makeBoard();

    kvMock.get.mockResolvedValueOnce(null);

    const getDreamBoardBySlug = vi.fn(async () => board);
    const getDreamBoardSlugById = vi.fn(async () => null);
    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardBySlug,
      getDreamBoardSlugById,
    }));

    const { getCachedDreamBoardBySlug } = await loadCache();
    const result = await getCachedDreamBoardBySlug('maya-birthday-123');

    expect(getDreamBoardBySlug).toHaveBeenCalledWith('maya-birthday-123');
    expect(kvMock.set).toHaveBeenCalledWith('dream-board:maya-birthday-123', board, {
      ex: 300,
    });
    expect(result?.deadline).toBeInstanceOf(Date);
  });
});

describe('invalidateDreamBoardCacheById', () => {
  it('clears cached board by id', async () => {
    const getDreamBoardBySlug = vi.fn(async () => null);
    const getDreamBoardSlugById = vi.fn(async () => 'maya-birthday-123');
    vi.doMock('@/lib/db/queries', () => ({
      getDreamBoardBySlug,
      getDreamBoardSlugById,
    }));

    const { invalidateDreamBoardCacheById } = await loadCache();
    await invalidateDreamBoardCacheById('board-1');

    expect(kvMock.del).toHaveBeenCalledWith('dream-board:maya-birthday-123');
  });
});
