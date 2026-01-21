import { describe, expect, it } from 'vitest';

import { calculateFee, calculateTotalWithFee } from '../../src/lib/payments/fees';

describe('payment fee helpers', () => {
  it('calculates total payment including fee', () => {
    const contributionCents = 20000;
    const feeCents = calculateFee(contributionCents);
    expect(feeCents).toBe(600);
    expect(calculateTotalWithFee(contributionCents)).toBe(contributionCents + feeCents);
  });
});
