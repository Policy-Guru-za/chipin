import { afterEach, describe, expect, it } from 'vitest';

import {
  decryptSensitiveBuffer,
  decryptSensitiveValue,
  encryptSensitiveBuffer,
  encryptSensitiveValue,
} from '@/lib/utils/encryption';

describe('encryption utilities', () => {
  const originalKey = process.env.CARD_DATA_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.CARD_DATA_ENCRYPTION_KEY = originalKey;
  });

  it('encrypts and decrypts sensitive values', () => {
    process.env.CARD_DATA_ENCRYPTION_KEY = 'test-key';
    const encrypted = encryptSensitiveValue('4111111111111111');
    expect(encrypted).not.toBe('4111111111111111');
    const decrypted = decryptSensitiveValue(encrypted);
    expect(decrypted).toBe('4111111111111111');
  });

  it('encrypts and decrypts buffers', () => {
    process.env.CARD_DATA_ENCRYPTION_KEY = 'test-key';
    const source = Buffer.from('receipt-data');
    const encrypted = encryptSensitiveBuffer(source);
    expect(encrypted.equals(source)).toBe(false);
    const decrypted = decryptSensitiveBuffer(encrypted);
    expect(decrypted.toString()).toBe('receipt-data');
  });

  it('throws when encryption key is missing', () => {
    process.env.CARD_DATA_ENCRYPTION_KEY = '';
    expect(() => encryptSensitiveValue('1234')).toThrow('CARD_DATA_ENCRYPTION_KEY is not set');
  });
});
