import { describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));

import { listDreamBoardsReadyForPayouts, listPayoutsForAdmin } from '@/lib/payouts/queries';

const makeBoardQuery = (result: unknown) => {
  const query: any = {};
  query.from = vi.fn(() => query);
  query.leftJoin = vi.fn(() => query);
  query.where = vi.fn(() => query);
  query.groupBy = vi.fn(() => query);
  query.orderBy = vi.fn(async () => result);
  return query;
};

const makePayoutQuery = (result: unknown) => {
  const query: any = {};
  query.from = vi.fn(() => query);
  query.where = vi.fn(async () => result);
  return query;
};

describe('payout queries', () => {
  it('returns empty list when no ready boards', async () => {
    dbMock.select.mockReturnValueOnce(makeBoardQuery([]));

    const result = await listDreamBoardsReadyForPayouts();

    expect(result).toEqual([]);
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });

  it('applies status filter for admin payouts', async () => {
    const query: any = {};
    query.from = vi.fn(() => query);
    query.leftJoin = vi.fn(() => query);
    query.where = vi.fn(() => query);
    query.orderBy = vi.fn(() => query);
    query.limit = vi.fn(() => query);
    query.offset = vi.fn(async () => [{ id: 'payout-1' }]);

    dbMock.select.mockReturnValueOnce(query);

    const result = await listPayoutsForAdmin({ statuses: ['pending'] });

    expect(query.where).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('includes boards missing overflow payouts', async () => {
    dbMock.select
      .mockReturnValueOnce(
        makeBoardQuery([
          {
            id: 'board-1',
            slug: 'maya',
            childName: 'Maya',
            giftType: 'takealot_product',
            status: 'closed',
            payoutMethod: 'takealot_gift_card',
            payoutEmail: 'host@chipin.co.za',
            goalCents: 10000,
            raisedCents: 12000,
            contributionCount: 2,
            hostEmail: 'host@chipin.co.za',
            updatedAt: new Date(),
          },
        ])
      )
      .mockReturnValueOnce(
        makePayoutQuery([{ dreamBoardId: 'board-1', type: 'takealot_gift_card' }])
      );

    const result = await listDreamBoardsReadyForPayouts();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('board-1');
  });
});
