import { afterEach, describe, expect, it } from 'vitest';

import {
  extractOzowTransactionReference,
  extractOzowTransactions,
  extractOzowReference,
  mapOzowTransactionStatus,
  mapOzowStatus,
  parseOzowAmountCents,
  parseOzowTransactionAmountCents,
  verifyOzowWebhook,
} from '@/lib/payments/ozow';

describe('Ozow webhook utilities', () => {
  const originalEnv = {
    OZOW_WEBHOOK_SECRET: process.env.OZOW_WEBHOOK_SECRET,
  };

  afterEach(() => {
    process.env.OZOW_WEBHOOK_SECRET = originalEnv.OZOW_WEBHOOK_SECRET;
  });

  it('extracts merchant references from payloads', () => {
    expect(
      extractOzowReference({
        data: { merchantReference: 'OZOW-REF-1' },
      })
    ).toBe('OZOW-REF-1');

    expect(
      extractOzowReference({
        merchant_reference: 'OZOW-REF-2',
      })
    ).toBe('OZOW-REF-2');
  });

  it('parses amount cents from numbers and strings', () => {
    expect(
      parseOzowAmountCents({
        data: { amount: { value: 52.5 } },
      })
    ).toBe(5250);
    expect(
      parseOzowAmountCents({
        amount: '150.00',
      })
    ).toBe(15000);
  });

  it('maps Ozow statuses', () => {
    expect(mapOzowStatus({ data: { status: 'PAID' } })).toBe('completed');
    expect(mapOzowStatus({ status: 'FAILED' })).toBe('failed');
    expect(mapOzowStatus({ status: 'PENDING' })).toBe('processing');
  });

  it('returns null when webhook secret is missing', () => {
    process.env.OZOW_WEBHOOK_SECRET = '';
    expect(verifyOzowWebhook('{}', new Headers())).toBeNull();
  });

  it('extracts transactions and maps statuses', () => {
    const payload = {
      data: [
        {
          merchantReference: 'OZOW-TXN',
          status: 'Successful',
          amount: { value: '52.50' },
        },
      ],
    };

    const transactions = extractOzowTransactions(payload);
    expect(transactions).toHaveLength(1);
    expect(extractOzowTransactionReference(transactions[0])).toBe('OZOW-TXN');
    expect(parseOzowTransactionAmountCents(transactions[0])).toBe(5250);
    expect(mapOzowTransactionStatus(transactions[0].status)).toBe('completed');
    expect(mapOzowTransactionStatus('Cancelled')).toBe('failed');
  });
});
