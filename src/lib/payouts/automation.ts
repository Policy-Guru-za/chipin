import * as Sentry from '@sentry/nextjs';
import { eq } from 'drizzle-orm';

import { recordAuditEvent, type AuditActor } from '@/lib/audit';
import { db } from '@/lib/db';
import { payouts } from '@/lib/db/schema';
import { createGivenGainDonation } from '@/lib/integrations/givengain';
import { topUpKarriCard } from '@/lib/integrations/karri';
import { issueTakealotGiftCard } from '@/lib/integrations/takealot-gift-cards';
import { log } from '@/lib/observability/logger';
import { decryptSensitiveValue } from '@/lib/utils/encryption';

import { getPayoutDetail } from './queries';
import { completePayout, failPayout, updatePayoutRecipientData } from './service';

type PayoutRecord = NonNullable<Awaited<ReturnType<typeof getPayoutDetail>>>;
type PayoutType = PayoutRecord['type'];

export type AutomationResult = {
  payoutId: string;
  status: 'completed' | 'pending' | 'failed';
  externalRef?: string;
};

const isEnabledFlag = (value?: string) => value === 'true';

export const isAutomationEnabledForType = (type: PayoutType) => {
  if (type === 'takealot_gift_card') {
    return isEnabledFlag(process.env.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED);
  }
  if (type === 'karri_card_topup') {
    return isEnabledFlag(process.env.KARRI_AUTOMATION_ENABLED);
  }
  if (type === 'philanthropy_donation') {
    return isEnabledFlag(process.env.GIVENGAIN_AUTOMATION_ENABLED);
  }
  return false;
};

const getGiftCardExternalRef = (result: {
  giftCardCode?: string;
  giftCardUrl?: string;
  orderId?: string;
}) => result.giftCardCode ?? result.giftCardUrl ?? result.orderId ?? 'gift-card';

const buildDonationMetadata = (result: { receiptUrl?: string; certificateUrl?: string }) => {
  const metadata: Record<string, unknown> = {};
  if (result.receiptUrl) metadata.receiptUrl = result.receiptUrl;
  if (result.certificateUrl) metadata.certificateUrl = result.certificateUrl;
  return metadata;
};

const applyDonationDocuments = async (params: {
  payout: PayoutRecord;
  actor: AuditActor;
  metadata: Record<string, unknown>;
}) => {
  if (!Object.keys(params.metadata).length) {
    return;
  }

  await updatePayoutRecipientData({
    payoutId: params.payout.id,
    data: params.metadata,
    actor: params.actor,
    action: 'payout.donation.documents',
    metadata: params.metadata,
  });
};

const getCauseId = (payout: PayoutRecord) => {
  if (payout.recipientData && typeof payout.recipientData === 'object') {
    const maybeCauseId = (payout.recipientData as { causeId?: unknown }).causeId;
    if (typeof maybeCauseId === 'string' && maybeCauseId.length > 0) {
      return maybeCauseId;
    }
  }

  const overflow = payout.overflowGiftData as { causeId?: unknown } | null;
  if (overflow && typeof overflow.causeId === 'string') {
    return overflow.causeId;
  }

  return null;
};

const getCardNumberEncrypted = (payout: PayoutRecord) => {
  if (payout.recipientData && typeof payout.recipientData === 'object') {
    const recipient = payout.recipientData as {
      cardNumberEncrypted?: unknown;
      cardNumber?: unknown;
    };
    if (typeof recipient.cardNumberEncrypted === 'string') {
      return recipient.cardNumberEncrypted;
    }
    if (typeof recipient.cardNumber === 'string') {
      return recipient.cardNumber;
    }
  }
  return null;
};

const markProcessing = async (payout: PayoutRecord) => {
  await db
    .update(payouts)
    .set({ status: 'processing', errorMessage: null })
    .where(eq(payouts.id, payout.id));
};

const recordAutomationEvent = async (params: {
  actor: AuditActor;
  action: string;
  payoutId: string;
  metadata?: Record<string, unknown>;
}) =>
  recordAuditEvent({
    actor: params.actor,
    action: params.action,
    target: { type: 'payout', id: params.payoutId },
    metadata: params.metadata,
  });

const markPendingPayout = async (params: {
  payout: PayoutRecord;
  externalRef: string;
  actor: AuditActor;
  metadata?: Record<string, unknown>;
}) => {
  await db
    .update(payouts)
    .set({ status: 'processing', externalRef: params.externalRef })
    .where(eq(payouts.id, params.payout.id));
  await recordAutomationEvent({
    actor: params.actor,
    action: 'payout.automation.pending',
    payoutId: params.payout.id,
    metadata: { externalRef: params.externalRef, ...params.metadata },
  });
};

const markCompletedPayout = async (params: {
  payout: PayoutRecord;
  externalRef: string;
  actor: AuditActor;
  metadata?: Record<string, unknown>;
}) => {
  await completePayout({
    payoutId: params.payout.id,
    externalRef: params.externalRef,
    actor: params.actor,
  });
  await recordAutomationEvent({
    actor: params.actor,
    action: 'payout.automation.completed',
    payoutId: params.payout.id,
    metadata: { externalRef: params.externalRef, ...params.metadata },
  });
};

const markFailedPayout = async (params: {
  payout: PayoutRecord;
  errorMessage: string;
  actor: AuditActor;
}) => {
  await failPayout({
    payoutId: params.payout.id,
    errorMessage: params.errorMessage,
    actor: params.actor,
  });
  await recordAutomationEvent({
    actor: params.actor,
    action: 'payout.automation.failed',
    payoutId: params.payout.id,
    metadata: { reason: params.errorMessage },
  });
};

const executeTakealotPayout = async (
  payout: PayoutRecord,
  actor: AuditActor
): Promise<AutomationResult> => {
  const recipientEmail =
    (payout.recipientData as { email?: string } | null)?.email ?? payout.payoutEmail;
  if (!recipientEmail) {
    throw new Error('Payout email is missing');
  }
  const giftData = payout.giftData as { productName?: string } | null;
  const result = await issueTakealotGiftCard({
    amountCents: payout.netCents,
    recipientEmail,
    reference: payout.id,
    message: giftData?.productName
      ? `Gift card for ${giftData.productName}`
      : `${payout.childName ?? 'Dream Board'} gift card`,
  });

  if (result.status === 'completed') {
    const externalRef = getGiftCardExternalRef(result);
    await markCompletedPayout({ payout, externalRef, actor });
    return { payoutId: payout.id, status: 'completed', externalRef };
  }

  if (result.status === 'pending') {
    const externalRef = getGiftCardExternalRef(result);
    await markPendingPayout({ payout, externalRef, actor });
    return { payoutId: payout.id, status: 'pending', externalRef };
  }

  await markFailedPayout({
    payout,
    errorMessage: result.errorMessage ?? 'Gift card automation failed',
    actor,
  });
  return { payoutId: payout.id, status: 'failed' };
};

const executeKarriPayout = async (
  payout: PayoutRecord,
  actor: AuditActor
): Promise<AutomationResult> => {
  const encryptedNumber = getCardNumberEncrypted(payout);
  if (!encryptedNumber) {
    throw new Error('Karri card number is missing');
  }
  const cardNumber = decryptSensitiveValue(encryptedNumber);
  const result = await topUpKarriCard({
    cardNumber,
    amountCents: payout.netCents,
    reference: payout.id,
    description: `${payout.childName ?? 'Dream Board'} gift top-up`,
  });

  if (result.status === 'completed') {
    await markCompletedPayout({ payout, externalRef: result.transactionId, actor });
    return { payoutId: payout.id, status: 'completed', externalRef: result.transactionId };
  }

  if (result.status === 'pending') {
    await markPendingPayout({ payout, externalRef: result.transactionId, actor });
    return { payoutId: payout.id, status: 'pending', externalRef: result.transactionId };
  }

  await markFailedPayout({
    payout,
    errorMessage: result.errorMessage ?? 'Karri top-up failed',
    actor,
  });
  return { payoutId: payout.id, status: 'failed' };
};

const executeDonationPayout = async (
  payout: PayoutRecord,
  actor: AuditActor
): Promise<AutomationResult> => {
  const causeId = getCauseId(payout);
  if (!causeId) {
    throw new Error('Donation cause is missing');
  }
  const result = await createGivenGainDonation({
    causeId,
    amountCents: payout.netCents,
    donorName: payout.childName ?? 'ChipIn donor',
    donorEmail: payout.payoutEmail ?? 'noreply@chipin.co.za',
    reference: payout.id,
    message: 'ChipIn group gift donation',
  });

  const metadata = buildDonationMetadata(result);
  await applyDonationDocuments({ payout, actor, metadata });

  if (result.status === 'completed') {
    await markCompletedPayout({
      payout,
      externalRef: result.donationId,
      actor,
      metadata,
    });
    return { payoutId: payout.id, status: 'completed', externalRef: result.donationId };
  }

  if (result.status === 'pending') {
    await markPendingPayout({
      payout,
      externalRef: result.donationId,
      actor,
      metadata,
    });
    return { payoutId: payout.id, status: 'pending', externalRef: result.donationId };
  }

  await markFailedPayout({
    payout,
    errorMessage: result.errorMessage ?? 'Donation automation failed',
    actor,
  });
  return { payoutId: payout.id, status: 'failed' };
};

export async function executeAutomatedPayout(params: {
  payoutId: string;
  actor: AuditActor;
}): Promise<AutomationResult> {
  const payout = await getPayoutDetail(params.payoutId);
  if (!payout) {
    throw new Error('Payout not found');
  }

  if (payout.status === 'completed') {
    return {
      payoutId: payout.id,
      status: 'completed',
      externalRef: payout.externalRef ?? undefined,
    };
  }

  if (!isAutomationEnabledForType(payout.type)) {
    throw new Error('Automation disabled for payout type');
  }

  await markProcessing(payout);
  await recordAutomationEvent({
    actor: params.actor,
    action: 'payout.automation.started',
    payoutId: payout.id,
    metadata: { payoutType: payout.type },
  });

  try {
    switch (payout.type) {
      case 'takealot_gift_card':
        return await executeTakealotPayout(payout, params.actor);
      case 'karri_card_topup':
        return await executeKarriPayout(payout, params.actor);
      case 'philanthropy_donation':
        return await executeDonationPayout(payout, params.actor);
      default:
        throw new Error('Unsupported payout type');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Automation failed';
    log('error', 'payout_automation_failed', { payoutId: payout.id, message });
    Sentry.captureException(error);
    await markFailedPayout({ payout, errorMessage: message, actor: params.actor });
    throw error;
  }
}
