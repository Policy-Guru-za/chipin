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
import { completePayout, failPayout } from './service';

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

  await recordAuditEvent({
    actor: params.actor,
    action: 'payout.automation.started',
    target: { type: 'payout', id: payout.id },
    metadata: { payoutType: payout.type },
  });

  try {
    if (payout.type === 'takealot_gift_card') {
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
        await completePayout({ payoutId: payout.id, externalRef, actor: params.actor });
        await recordAuditEvent({
          actor: params.actor,
          action: 'payout.automation.completed',
          target: { type: 'payout', id: payout.id },
          metadata: { externalRef },
        });
        return { payoutId: payout.id, status: 'completed', externalRef };
      }

      if (result.status === 'pending') {
        const externalRef = getGiftCardExternalRef(result);
        await db
          .update(payouts)
          .set({ status: 'processing', externalRef })
          .where(eq(payouts.id, payout.id));
        await recordAuditEvent({
          actor: params.actor,
          action: 'payout.automation.pending',
          target: { type: 'payout', id: payout.id },
          metadata: { externalRef },
        });
        return { payoutId: payout.id, status: 'pending', externalRef };
      }

      await failPayout({
        payoutId: payout.id,
        errorMessage: result.errorMessage ?? 'Gift card automation failed',
        actor: params.actor,
      });
      await recordAuditEvent({
        actor: params.actor,
        action: 'payout.automation.failed',
        target: { type: 'payout', id: payout.id },
        metadata: { reason: result.errorMessage ?? 'Gift card automation failed' },
      });
      return { payoutId: payout.id, status: 'failed' };
    }

    if (payout.type === 'karri_card_topup') {
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
        await completePayout({
          payoutId: payout.id,
          externalRef: result.transactionId,
          actor: params.actor,
        });
        await recordAuditEvent({
          actor: params.actor,
          action: 'payout.automation.completed',
          target: { type: 'payout', id: payout.id },
          metadata: { externalRef: result.transactionId },
        });
        return { payoutId: payout.id, status: 'completed', externalRef: result.transactionId };
      }

      if (result.status === 'pending') {
        await db
          .update(payouts)
          .set({ status: 'processing', externalRef: result.transactionId })
          .where(eq(payouts.id, payout.id));
        await recordAuditEvent({
          actor: params.actor,
          action: 'payout.automation.pending',
          target: { type: 'payout', id: payout.id },
          metadata: { externalRef: result.transactionId },
        });
        return { payoutId: payout.id, status: 'pending', externalRef: result.transactionId };
      }

      await failPayout({
        payoutId: payout.id,
        errorMessage: result.errorMessage ?? 'Karri top-up failed',
        actor: params.actor,
      });
      await recordAuditEvent({
        actor: params.actor,
        action: 'payout.automation.failed',
        target: { type: 'payout', id: payout.id },
        metadata: { reason: result.errorMessage ?? 'Karri top-up failed' },
      });
      return { payoutId: payout.id, status: 'failed' };
    }

    if (payout.type === 'philanthropy_donation') {
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

      if (result.status === 'completed') {
        await completePayout({
          payoutId: payout.id,
          externalRef: result.donationId,
          actor: params.actor,
        });
        await recordAuditEvent({
          actor: params.actor,
          action: 'payout.automation.completed',
          target: { type: 'payout', id: payout.id },
          metadata: {
            externalRef: result.donationId,
            ...buildDonationMetadata(result),
          },
        });
        return { payoutId: payout.id, status: 'completed', externalRef: result.donationId };
      }

      if (result.status === 'pending') {
        await db
          .update(payouts)
          .set({ status: 'processing', externalRef: result.donationId })
          .where(eq(payouts.id, payout.id));
        await recordAuditEvent({
          actor: params.actor,
          action: 'payout.automation.pending',
          target: { type: 'payout', id: payout.id },
          metadata: { externalRef: result.donationId, ...buildDonationMetadata(result) },
        });
        return { payoutId: payout.id, status: 'pending', externalRef: result.donationId };
      }

      await failPayout({
        payoutId: payout.id,
        errorMessage: result.errorMessage ?? 'Donation automation failed',
        actor: params.actor,
      });
      await recordAuditEvent({
        actor: params.actor,
        action: 'payout.automation.failed',
        target: { type: 'payout', id: payout.id },
        metadata: { reason: result.errorMessage ?? 'Donation automation failed' },
      });
      return { payoutId: payout.id, status: 'failed' };
    }

    throw new Error('Unsupported payout type');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Automation failed';
    log('error', 'payout_automation_failed', { payoutId: payout.id, message });
    Sentry.captureException(error);
    await failPayout({ payoutId: payout.id, errorMessage: message, actor: params.actor });
    await recordAuditEvent({
      actor: params.actor,
      action: 'payout.automation.failed',
      target: { type: 'payout', id: payout.id },
      metadata: { reason: message },
    });
    throw error;
  }
}
