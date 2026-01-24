import { describe, expect, it } from 'vitest';

import { getPayoutQueueErrorMessage } from '@/lib/payouts/admin-copy';

describe('getPayoutQueueErrorMessage', () => {
  it('returns no-contributions message', () => {
    expect(getPayoutQueueErrorMessage('no-contributions')).toBe(
      'No contributions collected yet for that Dream Board.'
    );
  });

  it('returns default error message', () => {
    expect(getPayoutQueueErrorMessage('payout-create-failed')).toBe(
      'Action failed. Please retry or check the payout details.'
    );
  });
});
