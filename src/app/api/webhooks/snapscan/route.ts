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

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const ip = getClientIp(request);

  const rateLimit = await enforceRateLimit(`webhook:snapscan:${ip ?? 'unknown'}`, {
    limit: 120,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    log('warn', 'payments.snapscan_rate_limited', { ip }, requestId);
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  if (!verifySnapScanSignature(rawBody, request.headers.get('authorization'))) {
    log('warn', 'payments.snapscan_invalid_signature', undefined, requestId);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const { payload } = parseSnapScanPayload(rawBody);
  if (!payload) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

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
        requestId
      );
      return NextResponse.json({ error: 'invalid_timestamp' }, { status: 400 });
    }
  } else {
    log('warn', 'payments.snapscan_timestamp_missing', undefined, requestId);
  }

  const paymentRef = extractSnapScanReference(payload);
  if (!paymentRef) {
    return NextResponse.json({ error: 'missing_reference' }, { status: 400 });
  }

  const contribution = await getContributionByPaymentRef('snapscan', paymentRef);
  if (!contribution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (contribution.paymentStatus === 'completed') {
    return NextResponse.json({ received: true });
  }

  const amountCents = parseSnapScanAmountCents(payload);
  const expectedTotal = contribution.amountCents + contribution.feeCents;
  if (amountCents === null) {
    log('warn', 'payments.snapscan_amount_missing', { paymentRef }, requestId);
    return NextResponse.json({ error: 'amount_missing' }, { status: 400 });
  } else if (amountCents !== expectedTotal) {
    log(
      'warn',
      'payments.snapscan_amount_mismatch',
      { expected: expectedTotal, received: amountCents, paymentRef },
      requestId
    );
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
  }

  const status = mapSnapScanStatus(payload);
  await updateContributionStatus(contribution.id, status);

  if (status === 'completed') {
    await markDreamBoardFundedIfNeeded(contribution.dreamBoardId);
  }

  return NextResponse.json({ received: true });
}
