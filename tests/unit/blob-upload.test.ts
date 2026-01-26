import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const putMock = vi.hoisted(() => vi.fn());

vi.mock('@vercel/blob', () => ({
  put: putMock,
  del: vi.fn(),
}));

import {
  UploadChildPhotoError,
  UploadReceiptError,
  uploadChildPhoto,
  uploadPayoutReceipt,
} from '../../src/lib/integrations/blob';

const createFile = (size: number, type: string) =>
  new File([new Uint8Array(size)], 'photo', { type });

const originalKey = process.env.CARD_DATA_ENCRYPTION_KEY;

beforeEach(() => {
  putMock.mockClear();
});

describe('uploadChildPhoto', () => {
  it('rejects empty files', async () => {
    await expect(uploadChildPhoto(createFile(0, 'image/jpeg'), 'host1')).rejects.toBeInstanceOf(
      UploadChildPhotoError
    );
  });

  it('rejects unsupported types', async () => {
    await expect(uploadChildPhoto(createFile(10, 'image/gif'), 'host1')).rejects.toBeInstanceOf(
      UploadChildPhotoError
    );
  });

  it('rejects files over 5MB', async () => {
    await expect(
      uploadChildPhoto(createFile(5 * 1024 * 1024 + 1, 'image/png'), 'host1')
    ).rejects.toBeInstanceOf(UploadChildPhotoError);
  });

  it('uploads valid files', async () => {
    putMock.mockResolvedValueOnce({ url: 'https://blob.example/photo.jpg' });
    const result = await uploadChildPhoto(createFile(1024, 'image/jpeg'), 'host1');

    expect(result.url).toBe('https://blob.example/photo.jpg');
    expect(putMock).toHaveBeenCalledOnce();
  });
});

describe('uploadPayoutReceipt', () => {
  afterEach(() => {
    process.env.CARD_DATA_ENCRYPTION_KEY = originalKey;
  });

  it('rejects unsupported receipt types', async () => {
    process.env.CARD_DATA_ENCRYPTION_KEY = 'test-key';
    await expect(
      uploadPayoutReceipt(createFile(10, 'image/gif'), 'payout-1', 'receipt')
    ).rejects.toBeInstanceOf(UploadReceiptError);
  });

  it('uploads encrypted receipts', async () => {
    process.env.CARD_DATA_ENCRYPTION_KEY = 'test-key';
    putMock.mockResolvedValueOnce({ url: 'https://blob.example/receipt.enc' });

    const result = await uploadPayoutReceipt(
      createFile(1024, 'application/pdf'),
      'payout-1',
      'receipt'
    );

    expect(result.url).toBe('https://blob.example/receipt.enc');
    expect(result.contentType).toBe('application/pdf');
    expect(result.encrypted).toBe(true);
    expect(putMock).toHaveBeenCalledOnce();
  });
});
