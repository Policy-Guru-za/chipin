import { NextRequest, NextResponse } from 'next/server';

import {
  extractOzowReference,
  mapOzowStatus,
  parseOzowAmountCents,
  verifyOzowWebhook,
} from '@/lib/payments/ozow';
import {
  getContributionByPaymentRef,
  markDreamBoardFundedIfNeeded,
  updateContributionStatus,
} from '@/lib/db/queries';
import { log } from '@/lib/observability/logger';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const requestId = request.headers.get('x-request-id') ?? undefined;

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
  await updateContributionStatus(contribution.id, status);

  if (status === 'completed') {
    await markDreamBoardFundedIfNeeded(contribution.dreamBoardId);
  }

  return NextResponse.json({ received: true });
}
