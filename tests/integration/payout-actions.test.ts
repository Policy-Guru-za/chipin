import { describe, expect, it, vi } from 'vitest';

const auditMocks = vi.hoisted(() => ({
  recordAuditEvent: vi.fn(),
}));

vi.mock('@/lib/audit', () => auditMocks);

import { addPayoutNote } from '@/lib/payouts/service';

describe('payout actions', () => {
  it('records notes as audit events', async () => {
    await addPayoutNote({
      payoutId: 'payout-1',
      note: 'Receipt uploaded',
      actor: { type: 'admin', email: 'ops@chipin.co.za' },
    });

    expect(auditMocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'payout.note' })
    );
  });
});
