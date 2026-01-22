import { describe, expect, it } from 'vitest';

import { getOverflowState } from '@/lib/dream-boards/overflow';

describe('getOverflowState', () => {
  it('marks overflow when funded takealot boards include overflow data', () => {
    const result = getOverflowState({
      raisedCents: 10000,
      goalCents: 8000,
      giftType: 'takealot_product',
      overflowGiftData: { causeId: 'food-forward' },
    });

    expect(result.funded).toBe(true);
    expect(result.showCharityOverflow).toBe(true);
  });

  it('does not show overflow for philanthropy boards', () => {
    const result = getOverflowState({
      raisedCents: 10000,
      goalCents: 8000,
      giftType: 'philanthropy',
      overflowGiftData: { causeId: 'food-forward' },
    });

    expect(result.funded).toBe(true);
    expect(result.showCharityOverflow).toBe(false);
  });
});
