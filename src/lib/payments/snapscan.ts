import crypto from 'crypto';

type SnapScanConfig = {
  snapCode: string;
  webhookAuthKey: string;
};

export type SnapScanPaymentParams = {
  amountCents: number;
  reference: string;
};

export type SnapScanPayment = {
  qrUrl: string;
  qrImageUrl: string;
};

export type SnapScanWebhookPayload = Record<string, unknown>;

const getSnapScanConfig = (): SnapScanConfig => ({
  snapCode: process.env.SNAPSCAN_SNAPCODE ?? '',
  webhookAuthKey: process.env.SNAPSCAN_WEBHOOK_AUTH_KEY ?? '',
});

export const isSnapScanConfigured = () => {
  const config = getSnapScanConfig();
  return Boolean(config.snapCode && config.webhookAuthKey);
};

export const createSnapScanPayment = (params: SnapScanPaymentParams): SnapScanPayment => {
  const config = getSnapScanConfig();
  if (!config.snapCode) {
    throw new Error('SnapScan snap code is missing');
  }

  const qrUrl = new URL(`https://pos.snapscan.io/qr/${config.snapCode}`);
  qrUrl.searchParams.set('id', params.reference);
  qrUrl.searchParams.set('amount', String(params.amountCents));
  qrUrl.searchParams.set('strict', 'true');

  const qrImageUrl = new URL(`https://pos.snapscan.io/qr/${config.snapCode}.svg`);
  qrImageUrl.searchParams.set('id', params.reference);
  qrImageUrl.searchParams.set('amount', String(params.amountCents));
  qrImageUrl.searchParams.set('strict', 'true');
  qrImageUrl.searchParams.set('snap_code_size', '200');

  return {
    qrUrl: qrUrl.toString(),
    qrImageUrl: qrImageUrl.toString(),
  };
};

const parseSnapScanSignature = (authorization?: string | null) => {
  if (!authorization) return null;
  const match = authorization.match(/snapscan\s+signature=([^,\s]+)/i);
  return match?.[1] ?? null;
};

export const verifySnapScanSignature = (rawBody: string, authorization?: string | null) => {
  const { webhookAuthKey } = getSnapScanConfig();
  const signature = parseSnapScanSignature(authorization);
  if (!signature || !webhookAuthKey) return false;

  const expected = crypto.createHmac('sha256', webhookAuthKey).update(rawBody).digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

export const parseSnapScanPayload = (rawBody: string) => {
  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get('payload');
  if (!payloadRaw) return { payload: null, payloadRaw: null };

  try {
    const payload = JSON.parse(payloadRaw) as SnapScanWebhookPayload;
    return { payload, payloadRaw };
  } catch {
    return { payload: null, payloadRaw };
  }
};

export const extractSnapScanReference = (payload: SnapScanWebhookPayload) => {
  const candidate =
    (payload as Record<string, unknown>).id ??
    (payload as Record<string, unknown>).reference ??
    (payload as Record<string, unknown>).merchantReference ??
    (payload as Record<string, unknown>).merchant_reference;

  return typeof candidate === 'string' ? candidate : null;
};

export const parseSnapScanAmountCents = (payload: SnapScanWebhookPayload) => {
  const rawAmount =
    (payload as Record<string, unknown>).amountCents ??
    (payload as Record<string, unknown>).amount_cents ??
    (payload as Record<string, unknown>).amount;

  if (typeof rawAmount === 'number') {
    return Number.isInteger(rawAmount) ? rawAmount : Math.round(rawAmount * 100);
  }

  if (typeof rawAmount === 'string') {
    const parsed = Number(rawAmount);
    if (Number.isNaN(parsed)) return null;
    return rawAmount.includes('.') ? Math.round(parsed * 100) : Math.round(parsed);
  }

  return null;
};

export const mapSnapScanStatus = (payload: SnapScanWebhookPayload) => {
  const rawStatus = (payload as Record<string, unknown>).status as string | undefined;
  if (!rawStatus) return 'processing';

  const normalized = rawStatus.toLowerCase();
  if (
    ['paid', 'complete', 'completed', 'success', 'successful'].some((value) =>
      normalized.includes(value)
    )
  ) {
    return 'completed';
  }
  if (
    ['failed', 'cancelled', 'canceled', 'expired', 'rejected'].some((value) =>
      normalized.includes(value)
    )
  ) {
    return 'failed';
  }
  return 'processing';
};
