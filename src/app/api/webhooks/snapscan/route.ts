import { NextRequest, NextResponse } from 'next/server';

import {
  extractSnapScanReference,
  mapSnapScanStatus,
  parseSnapScanAmountCents,
  parseSnapScanPayload,
  verifySnapScanSignature,
} from '@/lib/payments/snapscan';
import { enforceRateLimit } from '@/lib/auth/rate-limit';
import { extractTimestampValue, validateWebhookTimestamp } from '@/lib/payments/webhook-utils';
import {
  getContributionByPaymentRef,
  markDreamBoardFundedIfNeeded,
  updateContributionStatus,
} from '@/lib/db/queries';
import { invalidateDreamBoardCacheById } from '@/lib/dream-boards/cache';
import { log } from '@/lib/observability/logger';
import { getClientIp } from '@/lib/utils/request';
import { emitWebhookEventForPartner } from '@/lib/webhooks';
import {
  buildContributionWebhookPayload,
  buildDreamBoardWebhookPayload,
} from '@/lib/webhooks/payloads';

type WebhookContext = {
  requestId?: string;
  ip?: string | null;
};

const getWebhookContext = (request: NextRequest): WebhookContext => ({
  requestId: request.headers.get('x-request-id') ?? undefined,
  ip: getClientIp(request),
});

const rateLimitWebhook = async (context: WebhookContext) => {
  const rateLimit = await enforceRateLimit(`webhook:snapscan:${context.ip ?? 'unknown'}`, {
    limit: 120,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    log('warn', 'payments.snapscan_rate_limited', { ip: context.ip }, context.requestId);
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  return null;
};

const validateSignature = (rawBody: string, authHeader: string | null, context: WebhookContext) => {
  if (!verifySnapScanSignature(rawBody, authHeader)) {
    log('warn', 'payments.snapscan_invalid_signature', undefined, context.requestId);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }
  return null;
};

const validatePayload = (rawBody: string) => {
  const { payload } = parseSnapScanPayload(rawBody);
  if (!payload) {
    return { response: NextResponse.json({ error: 'invalid_payload' }, { status: 400 }) };
  }
  return { payload };
};

const validateTimestamp = (payload: Record<string, unknown>, context: WebhookContext) => {
  const timestampValue = extractTimestampValue(payload, [
    'timestamp',
    'payment_date',
    'paymentDate',
    'created_at',
    'createdAt',
    'event_time',
    'eventTime',
  ]);
  if (timestampValue) {
    const timestampResult = validateWebhookTimestamp(timestampValue);
    if (!timestampResult.ok) {
      log(
        'warn',
        'payments.snapscan_invalid_timestamp',
        { reason: timestampResult.reason },
        context.requestId
      );
      return NextResponse.json({ error: 'invalid_timestamp' }, { status: 400 });
    }
    return null;
  }

  log('warn', 'payments.snapscan_timestamp_missing', undefined, context.requestId);
  return null;
};

const validateContributionAmount = (
  paymentRef: string,
  payload: Record<string, unknown>,
  contribution: Awaited<ReturnType<typeof getContributionByPaymentRef>>,
  context: WebhookContext
) => {
  if (!contribution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (contribution.paymentStatus === 'completed') {
    return NextResponse.json({ received: true });
  }

  const amountCents = parseSnapScanAmountCents(payload);
  const expectedTotal = contribution.amountCents + contribution.feeCents;
  if (amountCents === null) {
    log('warn', 'payments.snapscan_amount_missing', { paymentRef }, context.requestId);
    return NextResponse.json({ error: 'amount_missing' }, { status: 400 });
  }
  if (amountCents !== expectedTotal) {
    log(
      'warn',
      'payments.snapscan_amount_mismatch',
      { expected: expectedTotal, received: amountCents, paymentRef },
      context.requestId
    );
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
  }

  return null;
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const context = getWebhookContext(request);

  const rateLimitResponse = await rateLimitWebhook(context);
  if (rateLimitResponse) return rateLimitResponse;

  const signatureResponse = validateSignature(
    rawBody,
    request.headers.get('authorization'),
    context
  );
  if (signatureResponse) return signatureResponse;

  const payloadResult = validatePayload(rawBody);
  if ('response' in payloadResult) return payloadResult.response;
  const { payload } = payloadResult;

  const timestampResponse = validateTimestamp(payload, context);
  if (timestampResponse) return timestampResponse;

  const paymentRef = extractSnapScanReference(payload);
  if (!paymentRef) {
    return NextResponse.json({ error: 'missing_reference' }, { status: 400 });
  }

  const contribution = await getContributionByPaymentRef('snapscan', paymentRef);
  const amountResponse = validateContributionAmount(paymentRef, payload, contribution, context);
  if (amountResponse) return amountResponse;
  if (!contribution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const status = mapSnapScanStatus(payload);
  if (contribution.paymentStatus === status) {
    return NextResponse.json({ received: true });
  }
  await updateContributionStatus(contribution.id, status);
  await invalidateDreamBoardCacheById(contribution.dreamBoardId);

  if (status === 'completed') {
    const wasFunded = await markDreamBoardFundedIfNeeded(contribution.dreamBoardId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const contributionPayload = await buildContributionWebhookPayload({
      contribution: { ...contribution, paymentStatus: status },
      baseUrl,
    });

    const eventIds = await emitWebhookEventForPartner(
      contribution.partnerId,
      'contribution.received',
      contributionPayload.data,
      contributionPayload.meta
    );

    if (!eventIds?.length) {
      log('warn', 'webhooks.emit_failed', {
        partnerId: contribution.partnerId,
        eventType: 'contribution.received',
        contributionId: contribution.id,
      });
    }

    if (wasFunded) {
      const dreamBoardPayload = await buildDreamBoardWebhookPayload(
        contribution.dreamBoardId,
        baseUrl
      );

      const eventIds = await emitWebhookEventForPartner(
        contribution.partnerId,
        'pot.funded',
        dreamBoardPayload.data,
        dreamBoardPayload.meta
      );

      if (!eventIds?.length) {
        log('warn', 'webhooks.emit_failed', {
          partnerId: contribution.partnerId,
          eventType: 'pot.funded',
          dreamBoardId: contribution.dreamBoardId,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
