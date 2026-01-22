import { describe, expect, it } from 'vitest';

import { decideReconciliation, getLongTailStart } from '@/lib/payments/reconciliation';

describe('decideReconciliation', () => {
  it('marks completed payments when totals match', () => {
    const result = decideReconciliation('completed', 5250, 5250);
    expect(result).toEqual({ action: 'update', status: 'completed' });
  });

  it('flags mismatches when amounts differ', () => {
    const result = decideReconciliation('completed', 5250, 5100);
    expect(result.action).toBe('mismatch');
  });

  it('marks failed payments', () => {
    const result = decideReconciliation('failed', 5250, null);
    expect(result).toEqual({ action: 'update', status: 'failed' });
  });
});

describe('getLongTailStart', () => {
  it('defaults to seven days when no env is set', () => {
    const original = process.env.RECONCILIATION_LONG_TAIL_HOURS;
    process.env.RECONCILIATION_LONG_TAIL_HOURS = '';
    const now = new Date('2026-01-22T12:00:00.000Z');
    const start = getLongTailStart(now);
    expect(start.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    process.env.RECONCILIATION_LONG_TAIL_HOURS = original;
  });
});
