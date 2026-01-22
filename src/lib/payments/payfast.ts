import crypto from 'crypto';

import { isIpInRanges } from '../utils/ip';

const PAYFAST_IP_RANGES = [
  '197.97.145.144/28',
  '41.74.179.192/27',
  '102.216.36.0/28',
  '102.216.36.128/28',
  '144.126.193.139',
];

type PayfastConfig = {
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
  sandbox: boolean;
};

export type PayfastPaymentParams = {
  amountCents: number;
  reference: string;
  itemName: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  emailAddress?: string;
};

export type PayfastPayment = {
  redirectUrl: string;
  fields: Array<[string, string]>;
};

export type PayfastItnPayload = Record<string, string>;

const getPayfastConfig = (): PayfastConfig => ({
  merchantId: process.env.PAYFAST_MERCHANT_ID ?? '',
  merchantKey: process.env.PAYFAST_MERCHANT_KEY ?? '',
  passphrase: process.env.PAYFAST_PASSPHRASE,
  sandbox: process.env.PAYFAST_SANDBOX === 'true',
});

const encodePayfast = (value: string) =>
  encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase());

const buildParamString = (fields: Array<[string, string]>) =>
  fields.map(([key, value]) => `${key}=${encodePayfast(value)}`).join('&');

const generateSignature = (fields: Array<[string, string]>, passphrase?: string) => {
  const paramString = buildParamString(fields);
  const signatureString = passphrase
    ? `${paramString}&passphrase=${encodePayfast(passphrase)}`
    : paramString;
  return crypto.createHash('md5').update(signatureString).digest('hex');
};

const getProcessUrl = (sandbox: boolean) =>
  sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process';

const getValidationUrl = (sandbox: boolean) =>
  sandbox
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';

export function createPayfastPayment(params: PayfastPaymentParams): PayfastPayment {
  const config = getPayfastConfig();
  if (!config.merchantId || !config.merchantKey) {
    throw new Error('PayFast credentials are missing');
  }

  const ordered = [
    ['merchant_id', config.merchantId],
    ['merchant_key', config.merchantKey],
    ['return_url', params.returnUrl],
    ['cancel_url', params.cancelUrl],
    ['notify_url', params.notifyUrl],
    ['email_address', params.emailAddress ?? ''],
    ['m_payment_id', params.reference],
    ['amount', (params.amountCents / 100).toFixed(2)],
    ['item_name', params.itemName],
  ].filter(([, value]) => value !== '') as Array<[string, string]>;

  const signature = generateSignature(ordered, config.passphrase);

  return {
    redirectUrl: getProcessUrl(config.sandbox),
    fields: [...ordered, ['signature', signature]],
  };
}

export const parsePayfastBody = (rawBody: string) => {
  const fields: Array<[string, string]> = [];
  const payload: PayfastItnPayload = {};
  let signature: string | null = null;

  for (const pair of rawBody.split('&')) {
    if (!pair) continue;
    const [rawKey, ...rest] = pair.split('=');
    const rawValue = rest.join('=');
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rawValue.replace(/\+/g, '%20'));

    if (key === 'signature') {
      signature = value;
      break;
    }

    fields.push([key, value]);
    payload[key] = value;
  }

  return { fields, payload, signature };
};

export const parsePayfastAmountCents = (value?: string) => {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
};

export const mapPayfastStatus = (status?: string) => {
  switch (status) {
    case 'COMPLETE':
      return 'completed';
    case 'CANCELLED':
    case 'FAILED':
      return 'failed';
    default:
      return 'processing';
  }
};

export const validatePayfastMerchant = (payload: PayfastItnPayload) => {
  const config = getPayfastConfig();
  if (!config.merchantId || !config.merchantKey) return false;
  return (
    payload['merchant_id'] === config.merchantId && payload['merchant_key'] === config.merchantKey
  );
};

export const verifyPayfastSignature = (rawBody: string) => {
  const config = getPayfastConfig();
  const { fields, signature } = parsePayfastBody(rawBody);
  if (!signature) return false;
  const expected = generateSignature(fields, config.passphrase);
  return signature === expected;
};

export const validatePayfastSource = (ipAddress?: string | null) => {
  if (!ipAddress) return false;
  return isIpInRanges(ipAddress, PAYFAST_IP_RANGES);
};

export const validatePayfastItn = async (rawBody: string) => {
  const config = getPayfastConfig();
  const { fields } = parsePayfastBody(rawBody);
  const response = await fetch(getValidationUrl(config.sandbox), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildParamString(fields),
  });

  const text = await response.text();
  return text.trim() === 'VALID';
};
