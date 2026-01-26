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
import { log } from '@/lib/observability/logger';

type WebhookContext = {
  requestId?: string;
  ip?: string | null;
};

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');

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
  await updateContributionStatus(contribution.id, status);

  if (status === 'completed') {
    await markDreamBoardFundedIfNeeded(contribution.dreamBoardId);
  }

  return NextResponse.json({ received: true });
}
