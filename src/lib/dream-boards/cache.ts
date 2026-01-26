import { kv } from '@vercel/kv';

import { getDreamBoardBySlug, getDreamBoardSlugById } from '@/lib/db/queries';

const DREAM_BOARD_CACHE_TTL_SECONDS = 5 * 60;

const dreamBoardCacheKey = (slug: string) => `dream-board:${slug}`;

type DreamBoardRecord = Awaited<ReturnType<typeof getDreamBoardBySlug>>;

const hydrateDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

const hydrateDreamBoard = (board: DreamBoardRecord): DreamBoardRecord => {
  if (!board) return board;

  return {
    ...board,
    deadline: hydrateDate(board.deadline),
    createdAt: hydrateDate(board.createdAt),
    updatedAt: hydrateDate(board.updatedAt),
  };
};

export const getCachedDreamBoardBySlug = async (slug: string): Promise<DreamBoardRecord> => {
  const cached = await kv.get<DreamBoardRecord>(dreamBoardCacheKey(slug));
  if (cached) {
    return hydrateDreamBoard(cached);
  }

  const board = await getDreamBoardBySlug(slug);
  if (board) {
    await kv.set(dreamBoardCacheKey(slug), board, { ex: DREAM_BOARD_CACHE_TTL_SECONDS });
  }

  return hydrateDreamBoard(board);
};

export const invalidateDreamBoardCacheBySlug = async (slug: string) => {
  await kv.del(dreamBoardCacheKey(slug));
};

export const invalidateDreamBoardCacheById = async (dreamBoardId: string) => {
  const slug = await getDreamBoardSlugById(dreamBoardId);
  if (!slug) return;

  await invalidateDreamBoardCacheBySlug(slug);
};
