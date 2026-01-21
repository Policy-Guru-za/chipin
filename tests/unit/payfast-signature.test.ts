import crypto from 'crypto';

import { describe, expect, it } from 'vitest';

import { parsePayfastBody, verifyPayfastSignature } from '../../src/lib/payments/payfast';

const encodePayfast = (value: string) =>
  encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase());

describe('PayFast signature verification', () => {
  it('verifies a valid signature from raw body', () => {
    process.env.PAYFAST_PASSPHRASE = 'test-pass';

    const ordered: Array<[string, string]> = [
      ['merchant_id', '10000100'],
      ['merchant_key', '46f0cd694581a'],
      ['return_url', 'https://chipin.co.za/return'],
      ['cancel_url', 'https://chipin.co.za/cancel'],
      ['notify_url', 'https://chipin.co.za/notify'],
      ['m_payment_id', 'CONTRIB-TEST'],
      ['amount', '206.00'],
      ['item_name', "Maya's Gift"],
    ];

    const paramString = ordered.map(([key, value]) => `${key}=${encodePayfast(value)}`).join('&');
    const signatureString = `${paramString}&passphrase=${encodePayfast('test-pass')}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');
    const rawBody = `${paramString}&signature=${signature}`;

    const parsed = parsePayfastBody(rawBody);
    expect(parsed.payload.m_payment_id).toBe('CONTRIB-TEST');
    expect(verifyPayfastSignature(rawBody)).toBe(true);
  });
});
