import { NextRequest, NextResponse } from 'next/server';

import {
  mapPayfastStatus,
  parsePayfastAmountCents,
  parsePayfastBody,
  validatePayfastMerchant,
  validatePayfastItn,
  validatePayfastSource,
  verifyPayfastSignature,
} from '@/lib/payments/payfast';
import {
  getContributionByPaymentRef,
  markDreamBoardFundedIfNeeded,
  updateContributionStatus,
} from '@/lib/db/queries';
import { log } from '@/lib/observability/logger';

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  request.headers.get('x-real-ip');

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const requestId = request.headers.get('x-request-id') ?? undefined;

  if (!verifyPayfastSignature(rawBody)) {
    log('warn', 'payments.payfast_invalid_signature', undefined, requestId);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const ip = getClientIp(request);
  if (process.env.NODE_ENV === 'production' && !validatePayfastSource(ip)) {
    log('warn', 'payments.payfast_invalid_source', { ip }, requestId);
    return NextResponse.json({ error: 'invalid_source' }, { status: 403 });
  }

  const validated = await validatePayfastItn(rawBody);
  if (!validated) {
    log('warn', 'payments.payfast_validation_failed', undefined, requestId);
    return NextResponse.json({ error: 'invalid_itn' }, { status: 400 });
  }

  const { payload } = parsePayfastBody(rawBody);
  if (!validatePayfastMerchant(payload)) {
    log(
      'warn',
      'payments.payfast_merchant_mismatch',
      {
        merchantId: payload['merchant_id'],
        merchantKeyPresent: Boolean(payload['merchant_key']),
        paymentRef: payload['m_payment_id'],
      },
      requestId
    );
    return NextResponse.json({ error: 'invalid_merchant' }, { status: 400 });
  }

  const pfPaymentId = payload['pf_payment_id'];
  if (!pfPaymentId) {
    log(
      'warn',
      'payments.payfast_missing_pf_payment_id',
      { paymentRef: payload['m_payment_id'] },
      requestId
    );
    return NextResponse.json({ error: 'missing_pf_payment_id' }, { status: 400 });
  }
  const paymentRef = payload['m_payment_id'];
  if (!paymentRef) {
    return NextResponse.json({ error: 'missing_reference' }, { status: 400 });
  }

  const contribution = await getContributionByPaymentRef('payfast', paymentRef);
  if (!contribution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (contribution.paymentStatus === 'completed') {
    return NextResponse.json({ received: true });
  }

  const amountCents = parsePayfastAmountCents(payload['amount_gross']);
  const expectedTotal = contribution.amountCents + contribution.feeCents;
  if (!amountCents || amountCents !== expectedTotal) {
    log(
      'warn',
      'payments.payfast_amount_mismatch',
      { expected: expectedTotal, received: amountCents, paymentRef },
      requestId
    );
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
  }

  const status = mapPayfastStatus(payload['payment_status']);
  await updateContributionStatus(contribution.id, status);

  if (status === 'completed') {
    await markDreamBoardFundedIfNeeded(contribution.dreamBoardId);
  }

  return NextResponse.json({ received: true });
}
