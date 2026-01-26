import { del, put } from '@vercel/blob';

import { encryptSensitiveBuffer } from '@/lib/utils/encryption';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const RECEIPT_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

const sanitizeFilename = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120);

export type UploadChildPhotoErrorCode = 'invalid_type' | 'file_too_large' | 'empty_file';

export type UploadReceiptErrorCode = 'invalid_type' | 'file_too_large' | 'empty_file';

export class UploadChildPhotoError extends Error {
  code: UploadChildPhotoErrorCode;

  constructor(code: UploadChildPhotoErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export class UploadReceiptError extends Error {
  code: UploadReceiptErrorCode;

  constructor(code: UploadReceiptErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export async function uploadChildPhoto(file: File, hostId: string) {
  if (file.size === 0) {
    throw new UploadChildPhotoError('empty_file', 'File is empty');
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    throw new UploadChildPhotoError('invalid_type', 'Invalid file type');
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new UploadChildPhotoError('file_too_large', 'File is too large');
  }

  const filename = `photos/${hostId}/${Date.now()}.${extension}`;
  const { url } = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  });

  return { url, filename };
}

export async function uploadPayoutReceipt(
  file: File,
  payoutId: string,
  documentType: 'receipt' | 'certificate'
) {
  if (file.size === 0) {
    throw new UploadReceiptError('empty_file', 'File is empty');
  }

  const extension = RECEIPT_EXTENSIONS[file.type];
  if (!extension) {
    throw new UploadReceiptError('invalid_type', 'Invalid file type');
  }

  if (file.size > MAX_RECEIPT_BYTES) {
    throw new UploadReceiptError('file_too_large', 'File is too large');
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const encrypted = encryptSensitiveBuffer(rawBuffer);
  const storageName = `payouts/${payoutId}/${documentType}-${Date.now()}.${extension}.enc`;
  const downloadName =
    file.name && file.name.trim().length > 0
      ? sanitizeFilename(file.name)
      : `${documentType}.${extension}`;

  const { url } = await put(storageName, encrypted, {
    access: 'public',
    contentType: 'application/octet-stream',
  });

  return {
    url,
    filename: storageName,
    downloadName,
    contentType: file.type,
    encrypted: true,
  };
}

export async function deleteChildPhoto(url: string) {
  await del(url);
}
