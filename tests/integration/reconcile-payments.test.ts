import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/internal/payments/reconcile/route');
};

const originalEnv = {
  INTERNAL_JOB_SECRET: process.env.INTERNAL_JOB_SECRET,
  RECONCILIATION_ALERTS_ENABLED: process.env.RECONCILIATION_ALERTS_ENABLED,
  RECONCILIATION_ALERT_EMAIL: process.env.RECONCILIATION_ALERT_EMAIL,
  RECONCILIATION_LONG_TAIL_HOURS: process.env.RECONCILIATION_LONG_TAIL_HOURS,
};

afterEach(() => {
  process.env.INTERNAL_JOB_SECRET = originalEnv.INTERNAL_JOB_SECRET;
  process.env.RECONCILIATION_ALERTS_ENABLED = originalEnv.RECONCILIATION_ALERTS_ENABLED;
  process.env.RECONCILIATION_ALERT_EMAIL = originalEnv.RECONCILIATION_ALERT_EMAIL;
  process.env.RECONCILIATION_LONG_TAIL_HOURS = originalEnv.RECONCILIATION_LONG_TAIL_HOURS;
  vi.unmock('@/lib/db/queries');
  vi.unmock('@/lib/payments/ozow');
  vi.unmock('@/lib/payments/snapscan');
  vi.clearAllMocks();
  vi.resetModules();
});

describe('payments reconciliation job - updates', () => {
  it('updates completed contributions from providers', async () => {
    process.env.INTERNAL_JOB_SECRET = 'job-secret';
    process.env.RECONCILIATION_ALERTS_ENABLED = 'false';

    const listContributionsForReconciliation = vi.fn(async () => [
      {
        id: 'contrib-ozow',
        dreamBoardId: 'board-1',
        paymentProvider: 'ozow',
        paymentRef: 'ozow-ref',
        amountCents: 5000,
        feeCents: 250,
        paymentStatus: 'pending',
        createdAt: new Date('2026-01-22T08:00:00.000Z'),
      },
      {
        id: 'contrib-snap',
        dreamBoardId: 'board-2',
        paymentProvider: 'snapscan',
        paymentRef: 'snap-ref',
        amountCents: 5000,
        feeCents: 250,
        paymentStatus: 'pending',
        createdAt: new Date('2026-01-22T08:10:00.000Z'),
      },
    ]);
    const updateContributionStatus = vi.fn(async () => undefined);
    const markDreamBoardFundedIfNeeded = vi.fn(async () => undefined);
    const listContributionsForLongTailReconciliation = vi.fn(async () => []);

    vi.doMock('@/lib/db/queries', () => ({
      listContributionsForReconciliation,
      listContributionsForLongTailReconciliation,
      updateContributionStatus,
      markDreamBoardFundedIfNeeded,
    }));

    vi.doMock('@/lib/payments/ozow', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/payments/ozow')>('@/lib/payments/ozow');
      return {
        ...actual,
        listOzowTransactionsPaged: vi.fn(async () => ({
          transactions: [
            {
              merchantReference: 'ozow-ref',
              status: 'Successful',
              amount: { value: '52.50' },
            },
          ],
          pagesFetched: 1,
          pagingComplete: true,
        })),
      };
    });

    const listSnapScanPayments = vi.fn(async () => [
      {
        merchantReference: 'snap-ref',
        status: 'completed',
        requiredAmount: 5250,
      },
    ]);

    vi.doMock('@/lib/payments/snapscan', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/payments/snapscan')>('@/lib/payments/snapscan');
      return {
        ...actual,
        listSnapScanPayments,
      };
    });

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/payments/reconcile', {
        method: 'POST',
        headers: { authorization: 'Bearer job-secret' },
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.updated).toBe(2);
    expect(updateContributionStatus).toHaveBeenCalledWith('contrib-ozow', 'completed');
    expect(updateContributionStatus).toHaveBeenCalledWith('contrib-snap', 'completed');
    expect(markDreamBoardFundedIfNeeded).toHaveBeenCalledTimes(2);
    expect(listSnapScanPayments).toHaveBeenCalledTimes(1);
    expect(listSnapScanPayments.mock.calls[0][0]?.startDate).toBe('2026-01-22T08:10:00.000Z');
  });
});

describe('payments reconciliation job - mismatches', () => {
  it('flags mismatches without updating', async () => {
    process.env.INTERNAL_JOB_SECRET = 'job-secret';
    process.env.RECONCILIATION_ALERTS_ENABLED = 'false';

    const listContributionsForReconciliation = vi.fn(async () => [
      {
        id: 'contrib-snap',
        dreamBoardId: 'board-2',
        paymentProvider: 'snapscan',
        paymentRef: 'snap-ref',
        amountCents: 5000,
        feeCents: 250,
        paymentStatus: 'pending',
        createdAt: new Date('2026-01-22T08:10:00.000Z'),
      },
    ]);
    const updateContributionStatus = vi.fn(async () => undefined);
    const markDreamBoardFundedIfNeeded = vi.fn(async () => undefined);
    const listContributionsForLongTailReconciliation = vi.fn(async () => []);

    vi.doMock('@/lib/db/queries', () => ({
      listContributionsForReconciliation,
      listContributionsForLongTailReconciliation,
      updateContributionStatus,
      markDreamBoardFundedIfNeeded,
    }));

    vi.doMock('@/lib/payments/snapscan', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/payments/snapscan')>('@/lib/payments/snapscan');
      return {
        ...actual,
        listSnapScanPayments: vi.fn(async () => [
          {
            merchantReference: 'snap-ref',
            status: 'completed',
            requiredAmount: 5100,
          },
        ]),
      };
    });

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/payments/reconcile', {
        method: 'POST',
        headers: { authorization: 'Bearer job-secret' },
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.mismatches).toBe(1);
    expect(updateContributionStatus).not.toHaveBeenCalled();
    expect(markDreamBoardFundedIfNeeded).not.toHaveBeenCalled();
  });
});

describe('payments reconciliation job - long tail', () => {
  it('reconciles long-tail contributions', async () => {
    process.env.INTERNAL_JOB_SECRET = 'job-secret';
    process.env.RECONCILIATION_ALERTS_ENABLED = 'false';
    process.env.RECONCILIATION_LONG_TAIL_HOURS = '168';

    const listContributionsForReconciliation = vi.fn(async () => []);
    const listContributionsForLongTailReconciliation = vi.fn(async () => [
      {
        id: 'contrib-long',
        dreamBoardId: 'board-3',
        paymentProvider: 'snapscan',
        paymentRef: 'snap-long',
        amountCents: 5000,
        feeCents: 250,
        paymentStatus: 'pending',
        createdAt: new Date('2026-01-10T08:10:00.000Z'),
      },
    ]);
    const updateContributionStatus = vi.fn(async () => undefined);
    const markDreamBoardFundedIfNeeded = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/queries', () => ({
      listContributionsForReconciliation,
      listContributionsForLongTailReconciliation,
      updateContributionStatus,
      markDreamBoardFundedIfNeeded,
    }));

    const listSnapScanPayments = vi.fn(async () => [
      {
        merchantReference: 'snap-long',
        status: 'completed',
        requiredAmount: 5250,
      },
    ]);

    vi.doMock('@/lib/payments/snapscan', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/payments/snapscan')>('@/lib/payments/snapscan');
      return {
        ...actual,
        listSnapScanPayments,
      };
    });

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/payments/reconcile', {
        method: 'POST',
        headers: { authorization: 'Bearer job-secret' },
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.longTail.scanned).toBe(1);
    expect(updateContributionStatus).toHaveBeenCalledWith('contrib-long', 'completed');
    expect(markDreamBoardFundedIfNeeded).toHaveBeenCalledWith('board-3');
    expect(listContributionsForLongTailReconciliation).toHaveBeenCalled();
    expect(listSnapScanPayments).toHaveBeenCalledTimes(1);
  });
});
