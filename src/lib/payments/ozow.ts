import crypto from 'crypto';

import { kv } from '@vercel/kv';
import { Webhook } from 'svix';

type OzowConfig = {
  clientId: string;
  clientSecret: string;
  siteCode: string;
  baseUrl: string;
  webhookSecret?: string;
};

export type OzowPaymentParams = {
  amountCents: number;
  reference: string;
  returnUrl: string;
  expiresAt?: string;
};

export type OzowPayment = {
  redirectUrl: string;
  providerReference?: string;
};

export type OzowWebhookPayload = Record<string, unknown>;

const getOzowConfig = (): OzowConfig => ({
  clientId: process.env.OZOW_CLIENT_ID ?? '',
  clientSecret: process.env.OZOW_CLIENT_SECRET ?? '',
  siteCode: process.env.OZOW_SITE_CODE ?? '',
  baseUrl: process.env.OZOW_BASE_URL ?? '',
  webhookSecret: process.env.OZOW_WEBHOOK_SECRET,
});

export const isOzowConfigured = () => {
  const config = getOzowConfig();
  return Boolean(
    config.clientId &&
    config.clientSecret &&
    config.siteCode &&
    config.baseUrl &&
    config.webhookSecret
  );
};

const tokenCacheKey = (scope: string) => `ozow:token:${scope}`;

export const getOzowAccessToken = async (scope: string) => {
  const config = getOzowConfig();
  if (!config.clientId || !config.clientSecret || !config.baseUrl) {
    throw new Error('Ozow credentials are missing');
  }

  const cacheKey = tokenCacheKey(scope);
  const cached = await kv.get<string>(cacheKey);
  if (cached) return cached;

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope,
    grant_type: 'client_credentials',
  });

  const response = await fetch(`${config.baseUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Ozow token request failed (${response.status})`);
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error('Ozow token response missing access_token');
  }

  const ttl = Math.max(60, (json.expires_in ?? 3600) - 60);
  await kv.set(cacheKey, json.access_token, { ex: ttl });
  return json.access_token;
};

export const createOzowPayment = async (params: OzowPaymentParams): Promise<OzowPayment> => {
  const config = getOzowConfig();
  if (!config.clientId || !config.clientSecret || !config.siteCode || !config.baseUrl) {
    throw new Error('Ozow configuration is incomplete');
  }

  const accessToken = await getOzowAccessToken('payment');
  const response = await fetch(`${config.baseUrl}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      siteCode: config.siteCode,
      amount: {
        currency: 'ZAR',
        value: Number((params.amountCents / 100).toFixed(2)),
      },
      merchantReference: params.reference,
      returnUrl: params.returnUrl,
      expireAt: params.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ozow payment request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { id?: string; redirectUrl?: string };
  if (!data.redirectUrl) {
    throw new Error('Ozow payment response missing redirectUrl');
  }

  return {
    redirectUrl: data.redirectUrl,
    providerReference: data.id,
  };
};

export const verifyOzowWebhook = (rawBody: string, headers: Headers) => {
  const { webhookSecret } = getOzowConfig();
  if (!webhookSecret) {
    return null;
  }

  const svixHeaders = {
    'svix-id': headers.get('svix-id') ?? '',
    'svix-timestamp': headers.get('svix-timestamp') ?? '',
    'svix-signature': headers.get('svix-signature') ?? '',
  };

  try {
    const webhook = new Webhook(webhookSecret);
    return webhook.verify(rawBody, svixHeaders) as OzowWebhookPayload;
  } catch {
    return null;
  }
};

export const extractOzowReference = (payload: OzowWebhookPayload) => {
  const data = payload?.data as Record<string, unknown> | undefined;
  const candidate =
    data?.merchantReference ??
    data?.merchant_reference ??
    (payload as Record<string, unknown>).merchantReference ??
    (payload as Record<string, unknown>).merchant_reference;

  return typeof candidate === 'string' ? candidate : null;
};

export const parseOzowAmountCents = (payload: OzowWebhookPayload) => {
  const data = payload?.data as Record<string, unknown> | undefined;
  const amountValue =
    (data?.amount as { value?: number | string } | undefined)?.value ??
    data?.amount ??
    (payload as Record<string, unknown>).amount;

  if (typeof amountValue === 'number') {
    return Math.round(amountValue * 100);
  }

  if (typeof amountValue === 'string') {
    const parsed = Number(amountValue);
    if (Number.isNaN(parsed)) return null;
    return Math.round(parsed * 100);
  }

  return null;
};

export const mapOzowStatus = (payload: OzowWebhookPayload) => {
  const data = payload?.data as Record<string, unknown> | undefined;
  const rawStatus =
    (data?.status as string | undefined) ??
    (data?.transactionStatus as string | undefined) ??
    ((payload as Record<string, unknown>).status as string | undefined);

  if (!rawStatus) return 'processing';

  const normalized = rawStatus.toLowerCase();
  if (['paid', 'completed', 'success', 'successful'].some((value) => normalized.includes(value))) {
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
