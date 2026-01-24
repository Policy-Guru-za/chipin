import { describe, expect, it } from 'vitest';

import { uiCopy } from '@/lib/ui/copy';

describe('uiCopy', () => {
  it('provides core state copy strings', () => {
    expect(uiCopy.guest.closed.body).toContain('Dream Board');
    expect(uiCopy.guest.paymentsUnavailable.body).toContain('Payments');
    expect(uiCopy.dashboard.empty.body).toContain('Dream Boards');
    expect(uiCopy.contributions.empty.body).toContain('contributions');
  });
});
