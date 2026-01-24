import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  update: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  recordAuditEvent: vi.fn(),
}));

const payoutQueryMocks = vi.hoisted(() => ({
  getPayoutDetail: vi.fn(),
}));

const payoutServiceMocks = vi.hoisted(() => ({
  completePayout: vi.fn(),
  failPayout: vi.fn(),
}));

const integrationMocks = vi.hoisted(() => ({
  issueTakealotGiftCard: vi.fn(),
  topUpKarriCard: vi.fn(),
  createGivenGainDonation: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/audit', () => auditMocks);
vi.mock('@/lib/payouts/queries', () => payoutQueryMocks);
vi.mock('@/lib/payouts/service', () => payoutServiceMocks);
vi.mock('@/lib/integrations/takealot-gift-cards', () => ({
  issueTakealotGiftCard: integrationMocks.issueTakealotGiftCard,
}));
vi.mock('@/lib/integrations/karri', () => ({
  topUpKarriCard: integrationMocks.topUpKarriCard,
}));
vi.mock('@/lib/integrations/givengain', () => ({
  createGivenGainDonation: integrationMocks.createGivenGainDonation,
}));
vi.mock('@/lib/utils/encryption', () => ({
  decryptSensitiveValue: vi.fn(() => '4111111111111111'),
}));

const loadModule = async () => {
  vi.resetModules();
  return import('@/lib/payouts/automation');
};

describe('payout automation', () => {
  const originalEnv = {
    TAKEALOT_GIFTCARD_AUTOMATION_ENABLED: process.env.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED,
    KARRI_AUTOMATION_ENABLED: process.env.KARRI_AUTOMATION_ENABLED,
    GIVENGAIN_AUTOMATION_ENABLED: process.env.GIVENGAIN_AUTOMATION_ENABLED,
  };

  beforeEach(() => {
    const updateChain = { set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) };
    dbMock.update.mockReturnValue(updateChain);
  });

  afterEach(() => {
    process.env.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED =
      originalEnv.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED;
    process.env.KARRI_AUTOMATION_ENABLED = originalEnv.KARRI_AUTOMATION_ENABLED;
    process.env.GIVENGAIN_AUTOMATION_ENABLED = originalEnv.GIVENGAIN_AUTOMATION_ENABLED;
    vi.clearAllMocks();
  });

  it('executes Takealot gift card automation', async () => {
    process.env.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED = 'true';
    payoutQueryMocks.getPayoutDetail.mockResolvedValue({
      id: 'payout-1',
      type: 'takealot_gift_card',
      status: 'pending',
      netCents: 5000,
      payoutEmail: 'host@chipin.co.za',
      recipientData: { email: 'host@chipin.co.za' },
      giftData: { productName: 'Train set' },
      childName: 'Maya',
      overflowGiftData: null,
    });
    integrationMocks.issueTakealotGiftCard.mockResolvedValue({
      status: 'completed',
      giftCardCode: 'GC-123',
    });

    const { executeAutomatedPayout } = await loadModule();
    await executeAutomatedPayout({ payoutId: 'payout-1', actor: { type: 'admin' } });

    expect(integrationMocks.issueTakealotGiftCard).toHaveBeenCalled();
    expect(payoutServiceMocks.completePayout).toHaveBeenCalledWith(
      expect.objectContaining({ payoutId: 'payout-1', externalRef: 'GC-123' })
    );
  });

  it('returns pending when Takealot provider is processing', async () => {
    process.env.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED = 'true';
    payoutQueryMocks.getPayoutDetail.mockResolvedValue({
      id: 'payout-pending',
      type: 'takealot_gift_card',
      status: 'pending',
      netCents: 5000,
      payoutEmail: 'host@chipin.co.za',
      recipientData: { email: 'host@chipin.co.za' },
      giftData: { productName: 'Train set' },
      childName: 'Maya',
      overflowGiftData: null,
    });
    integrationMocks.issueTakealotGiftCard.mockResolvedValue({
      status: 'pending',
      orderId: 'ORDER-1',
    });

    const { executeAutomatedPayout } = await loadModule();
    const result = await executeAutomatedPayout({
      payoutId: 'payout-pending',
      actor: { type: 'admin' },
    });

    expect(result.status).toBe('pending');
    expect(result.externalRef).toBe('ORDER-1');
    expect(payoutServiceMocks.completePayout).not.toHaveBeenCalled();
  });

  it('executes Karri top-up automation', async () => {
    process.env.KARRI_AUTOMATION_ENABLED = 'true';
    payoutQueryMocks.getPayoutDetail.mockResolvedValue({
      id: 'payout-2',
      type: 'karri_card_topup',
      status: 'pending',
      netCents: 6500,
      payoutEmail: 'host@chipin.co.za',
      recipientData: { cardNumberEncrypted: 'encrypted' },
      childName: 'Maya',
      overflowGiftData: null,
    });
    integrationMocks.topUpKarriCard.mockResolvedValue({
      status: 'completed',
      transactionId: 'K-123',
    });

    const { executeAutomatedPayout } = await loadModule();
    await executeAutomatedPayout({ payoutId: 'payout-2', actor: { type: 'admin' } });

    expect(integrationMocks.topUpKarriCard).toHaveBeenCalled();
    expect(payoutServiceMocks.completePayout).toHaveBeenCalledWith(
      expect.objectContaining({ payoutId: 'payout-2', externalRef: 'K-123' })
    );
  });

  it('executes GivenGain donation automation', async () => {
    process.env.GIVENGAIN_AUTOMATION_ENABLED = 'true';
    payoutQueryMocks.getPayoutDetail.mockResolvedValue({
      id: 'payout-3',
      type: 'philanthropy_donation',
      status: 'pending',
      netCents: 4200,
      payoutEmail: 'host@chipin.co.za',
      recipientData: { causeId: 'cause-1' },
      childName: 'Maya',
      overflowGiftData: null,
    });
    integrationMocks.createGivenGainDonation.mockResolvedValue({
      status: 'completed',
      donationId: 'DG-123',
    });

    const { executeAutomatedPayout } = await loadModule();
    await executeAutomatedPayout({ payoutId: 'payout-3', actor: { type: 'admin' } });

    expect(integrationMocks.createGivenGainDonation).toHaveBeenCalled();
    expect(payoutServiceMocks.completePayout).toHaveBeenCalledWith(
      expect.objectContaining({ payoutId: 'payout-3', externalRef: 'DG-123' })
    );
  });

  it('returns pending when GivenGain donation is processing', async () => {
    process.env.GIVENGAIN_AUTOMATION_ENABLED = 'true';
    payoutQueryMocks.getPayoutDetail.mockResolvedValue({
      id: 'payout-4',
      type: 'philanthropy_donation',
      status: 'pending',
      netCents: 4200,
      payoutEmail: 'host@chipin.co.za',
      recipientData: { causeId: 'cause-1' },
      childName: 'Maya',
      overflowGiftData: null,
    });
    integrationMocks.createGivenGainDonation.mockResolvedValue({
      status: 'pending',
      donationId: 'DG-456',
    });

    const { executeAutomatedPayout } = await loadModule();
    const result = await executeAutomatedPayout({ payoutId: 'payout-4', actor: { type: 'admin' } });

    expect(result.status).toBe('pending');
    expect(result.externalRef).toBe('DG-456');
  });

  it('marks Karri payout as failed when provider fails', async () => {
    process.env.KARRI_AUTOMATION_ENABLED = 'true';
    payoutQueryMocks.getPayoutDetail.mockResolvedValue({
      id: 'payout-5',
      type: 'karri_card_topup',
      status: 'pending',
      netCents: 6500,
      payoutEmail: 'host@chipin.co.za',
      recipientData: { cardNumberEncrypted: 'encrypted' },
      childName: 'Maya',
      overflowGiftData: null,
    });
    integrationMocks.topUpKarriCard.mockResolvedValue({
      status: 'failed',
      transactionId: 'K-FAIL',
      errorMessage: 'Card declined',
    });

    const { executeAutomatedPayout } = await loadModule();
    const result = await executeAutomatedPayout({ payoutId: 'payout-5', actor: { type: 'admin' } });

    expect(result.status).toBe('failed');
    expect(payoutServiceMocks.failPayout).toHaveBeenCalledWith(
      expect.objectContaining({ payoutId: 'payout-5', errorMessage: 'Card declined' })
    );
  });

  it('throws when automation is disabled', async () => {
    process.env.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED = 'false';
    payoutQueryMocks.getPayoutDetail.mockResolvedValue({
      id: 'payout-disabled',
      type: 'takealot_gift_card',
      status: 'pending',
      netCents: 5000,
      payoutEmail: 'host@chipin.co.za',
      recipientData: { email: 'host@chipin.co.za' },
      childName: 'Maya',
      giftData: null,
      overflowGiftData: null,
    });

    const { executeAutomatedPayout } = await loadModule();

    await expect(
      executeAutomatedPayout({ payoutId: 'payout-disabled', actor: { type: 'admin' } })
    ).rejects.toThrow('Automation disabled');
  });
});
