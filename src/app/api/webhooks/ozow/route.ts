import { NextRequest, NextResponse } from 'next/server';

import {
  extractOzowReference,
  mapOzowStatus,
  parseOzowAmountCents,
  verifyOzowWebhook,
} from '@/lib/payments/ozow';
import { enforceRateLimit } from '@/lib/auth/rate-limit';
import {
  getContributionByPaymentRef,
  markDreamBoardFundedIfNeeded,
  updateContributionStatus,
} from '@/lib/db/queries';
import { invalidateDreamBoardCacheById } from '@/lib/dream-boards/cache';
import { log } from '@/lib/observability/logger';

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const ip = getClientIp(request);

  const rateLimit = await enforceRateLimit(`webhook:ozow:${ip ?? 'unknown'}`, {
    limit: 120,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    log('warn', 'payments.ozow_rate_limited', { ip }, requestId);
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  const payload = verifyOzowWebhook(rawBody, request.headers);
  if (!payload) {
    log('warn', 'payments.ozow_invalid_signature', undefined, requestId);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const paymentRef = extractOzowReference(payload);
  if (!paymentRef) {
    return NextResponse.json({ error: 'missing_reference' }, { status: 400 });
  }

  const contribution = await getContributionByPaymentRef('ozow', paymentRef);
  if (!contribution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (contribution.paymentStatus === 'completed') {
    return NextResponse.json({ received: true });
  }

  const amountCents = parseOzowAmountCents(payload);
  const expectedTotal = contribution.amountCents + contribution.feeCents;
  if (amountCents === null) {
    log('warn', 'payments.ozow_amount_missing', { paymentRef }, requestId);
    return NextResponse.json({ error: 'amount_missing' }, { status: 400 });
  } else if (amountCents !== expectedTotal) {
    log(
      'warn',
      'payments.ozow_amount_mismatch',
      { expected: expectedTotal, received: amountCents, paymentRef },
      requestId
    );
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
  }

  const status = mapOzowStatus(payload);
  if (contribution.paymentStatus === status) {
    return NextResponse.json({ received: true });
  }
  await updateContributionStatus(contribution.id, status);
  await invalidateDreamBoardCacheById(contribution.dreamBoardId);

  if (status === 'completed') {
    await markDreamBoardFundedIfNeeded(contribution.dreamBoardId);
  }

  return NextResponse.json({ received: true });
}
