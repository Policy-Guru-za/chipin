import { describe, expect, it } from 'vitest';

import { calculatePayoutTotals } from '@/lib/payouts/calculation';

describe('calculatePayoutTotals', () => {
  it('splits gift and overflow correctly', () => {
    const result = calculatePayoutTotals({
      raisedCents: 12000,
      goalCents: 10000,
      platformFeeCents: 600,
    });

    expect(result.giftCents).toBe(10000);
    expect(result.overflowCents).toBe(2000);
    expect(result.platformFeeCents).toBe(600);
  });

  it('handles under-goal totals', () => {
    const result = calculatePayoutTotals({
      raisedCents: 4500,
      goalCents: 10000,
      platformFeeCents: 200,
    });

    expect(result.giftCents).toBe(4500);
    expect(result.overflowCents).toBe(0);
  });
});
