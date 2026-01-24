import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  recordAuditEvent: vi.fn(),
}));

const payoutQueryMocks = vi.hoisted(() => ({
  getDreamBoardPayoutContext: vi.fn(),
  getContributionTotalsForDreamBoard: vi.fn(),
  listPayoutsForDreamBoard: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/audit', () => auditMocks);
vi.mock('@/lib/payouts/queries', () => payoutQueryMocks);

import { payoutItems, payouts } from '@/lib/db/schema';
import { createPayoutsForDreamBoard } from '@/lib/payouts/service';

describe('payout service creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips payout creation when nothing raised', async () => {
    payoutQueryMocks.getDreamBoardPayoutContext.mockResolvedValue({
      id: 'board-1',
      status: 'closed',
      giftType: 'takealot_product',
      payoutMethod: 'takealot_gift_card',
      goalCents: 10000,
      payoutEmail: 'host@chipin.co.za',
      overflowGiftData: null,
      childName: 'Maya',
      hostEmail: 'host@chipin.co.za',
      hostId: 'host-1',
    });
    payoutQueryMocks.getContributionTotalsForDreamBoard.mockResolvedValue({
      raisedCents: 0,
      platformFeeCents: 0,
    });
    payoutQueryMocks.listPayoutsForDreamBoard.mockResolvedValue([]);

    const result = await createPayoutsForDreamBoard({
      dreamBoardId: 'board-1',
      actor: { type: 'admin' },
    });

    expect(result.skipped).toBe(true);
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it('rejects payouts for funded boards', async () => {
    payoutQueryMocks.getDreamBoardPayoutContext.mockResolvedValue({
      id: 'board-1',
      status: 'funded',
      giftType: 'takealot_product',
      payoutMethod: 'takealot_gift_card',
      goalCents: 10000,
      payoutEmail: 'host@chipin.co.za',
      overflowGiftData: null,
      childName: 'Maya',
      hostEmail: 'host@chipin.co.za',
      hostId: 'host-1',
      giftData: { productName: 'Train set' },
    });

    await expect(
      createPayoutsForDreamBoard({
        dreamBoardId: 'board-1',
        actor: { type: 'admin' },
      })
    ).rejects.toThrow('Dream Board is not ready for payout');
  });

  it('creates gift and overflow payouts when goal exceeded', async () => {
    payoutQueryMocks.getDreamBoardPayoutContext.mockResolvedValue({
      id: 'board-2',
      status: 'closed',
      giftType: 'takealot_product',
      payoutMethod: 'takealot_gift_card',
      goalCents: 10000,
      payoutEmail: 'host@chipin.co.za',
      overflowGiftData: { causeId: 'cause-1' },
      childName: 'Luca',
      hostEmail: 'host@chipin.co.za',
      hostId: 'host-2',
    });
    payoutQueryMocks.getContributionTotalsForDreamBoard.mockResolvedValue({
      raisedCents: 14000,
      platformFeeCents: 600,
    });
    payoutQueryMocks.listPayoutsForDreamBoard.mockResolvedValue([]);

    let createdCount = 0;
    const insert = vi.fn((table: unknown) => {
      if (table === payouts) {
        return {
          values: vi.fn(() => ({
            onConflictDoNothing: vi.fn(() => ({
              returning: vi.fn(async () => {
                createdCount += 1;
                return [
                  {
                    id: `payout-${createdCount}`,
                    type: createdCount === 1 ? 'takealot_gift_card' : 'philanthropy_donation',
                  },
                ];
              }),
            })),
          })),
        };
      }
      if (table === payoutItems) {
        return { values: vi.fn(async () => undefined) };
      }
      return { values: vi.fn(async () => undefined) };
    });

    dbMock.transaction.mockImplementation(async (callback: any) => callback({ insert }));

    const result = await createPayoutsForDreamBoard({
      dreamBoardId: 'board-2',
      actor: { type: 'admin' },
    });

    expect(result.created).toHaveLength(2);
    expect(auditMocks.recordAuditEvent).toHaveBeenCalledTimes(2);
  });
});
