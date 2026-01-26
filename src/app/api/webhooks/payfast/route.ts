import { NextRequest, NextResponse } from 'next/server';

import {
  mapPayfastStatus,
  parsePayfastAmountCents,
  parsePayfastBody,
  validatePayfastItn,
  validatePayfastMerchant,
  validatePayfastSource,
  verifyPayfastSignature,
} from '@/lib/payments/payfast';
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
  const rateLimit = await enforceRateLimit(`webhook:payfast:${context.ip ?? 'unknown'}`, {
    limit: 120,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    log('warn', 'payments.payfast_rate_limited', { ip: context.ip }, context.requestId);
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  return null;
};

const validateSignature = (rawBody: string, context: WebhookContext) => {
  if (!verifyPayfastSignature(rawBody)) {
    log('warn', 'payments.payfast_invalid_signature', undefined, context.requestId);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }
  return null;
};

const validateSourceIp = (context: WebhookContext) => {
  if (process.env.NODE_ENV === 'production' && !validatePayfastSource(context.ip)) {
    log('warn', 'payments.payfast_invalid_source', { ip: context.ip }, context.requestId);
    return NextResponse.json({ error: 'invalid_source' }, { status: 403 });
  }
  return null;
};

const validateMerchant = (payload: Record<string, string>, context: WebhookContext) => {
  if (!validatePayfastMerchant(payload)) {
    log(
      'warn',
      'payments.payfast_merchant_mismatch',
      {
        merchantId: payload['merchant_id'],
        merchantKeyPresent: Boolean(payload['merchant_key']),
        paymentRef: payload['m_payment_id'],
      },
      context.requestId
    );
    return NextResponse.json({ error: 'invalid_merchant' }, { status: 400 });
  }
  return null;
};

const validateTimestamp = (payload: Record<string, string>, context: WebhookContext) => {
  const timestampValue = extractTimestampValue(payload, ['timestamp', 'payment_date']);
  if (timestampValue) {
    const timestampResult = validateWebhookTimestamp(timestampValue);
    if (!timestampResult.ok) {
      log(
        'warn',
        'payments.payfast_invalid_timestamp',
        { reason: timestampResult.reason, paymentRef: payload['m_payment_id'] },
        context.requestId
      );
      return NextResponse.json({ error: 'invalid_timestamp' }, { status: 400 });
    }
    return null;
  }

  log(
    'warn',
    'payments.payfast_timestamp_missing',
    { paymentRef: payload['m_payment_id'] },
    context.requestId
  );
  return null;
};

const validateItnPayload = async (rawBody: string, context: WebhookContext) => {
  const validated = await validatePayfastItn(rawBody);
  if (!validated) {
    log('warn', 'payments.payfast_validation_failed', undefined, context.requestId);
    return NextResponse.json({ error: 'invalid_itn' }, { status: 400 });
  }
  return null;
};

const validatePayfastReferences = (payload: Record<string, string>, context: WebhookContext) => {
  const pfPaymentId = payload['pf_payment_id'];
  if (!pfPaymentId) {
    log(
      'warn',
      'payments.payfast_missing_pf_payment_id',
      { paymentRef: payload['m_payment_id'] },
      context.requestId
    );
    return NextResponse.json({ error: 'missing_pf_payment_id' }, { status: 400 });
  }
  if (!payload['m_payment_id']) {
    return NextResponse.json({ error: 'missing_reference' }, { status: 400 });
  }
  return null;
};

const validateContributionAmount = (
  payload: Record<string, string>,
  contribution: Awaited<ReturnType<typeof getContributionByPaymentRef>>,
  context: WebhookContext
) => {
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
      { expected: expectedTotal, received: amountCents, paymentRef: payload['m_payment_id'] },
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

  const signatureResponse = validateSignature(rawBody, context);
  if (signatureResponse) return signatureResponse;

  const sourceResponse = validateSourceIp(context);
  if (sourceResponse) return sourceResponse;

  const { payload } = parsePayfastBody(rawBody);
  const merchantResponse = validateMerchant(payload, context);
  if (merchantResponse) return merchantResponse;

  const timestampResponse = validateTimestamp(payload, context);
  if (timestampResponse) return timestampResponse;

  const itnResponse = await validateItnPayload(rawBody, context);
  if (itnResponse) return itnResponse;

  const referenceResponse = validatePayfastReferences(payload, context);
  if (referenceResponse) return referenceResponse;

  const paymentRef = payload['m_payment_id'];
  const contribution = await getContributionByPaymentRef('payfast', paymentRef);
  const amountResponse = validateContributionAmount(payload, contribution, context);
  if (amountResponse) return amountResponse;
  if (!contribution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const status = mapPayfastStatus(payload['payment_status']);
  await updateContributionStatus(contribution.id, status);

  if (status === 'completed') {
    await markDreamBoardFundedIfNeeded(contribution.dreamBoardId);
  }

  return NextResponse.json({ received: true });
}
