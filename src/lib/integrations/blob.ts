import { del, put } from '@vercel/blob';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type UploadChildPhotoErrorCode = 'invalid_type' | 'file_too_large' | 'empty_file';

export class UploadChildPhotoError extends Error {
  code: UploadChildPhotoErrorCode;

  constructor(code: UploadChildPhotoErrorCode, message: string) {
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

export async function deleteChildPhoto(url: string) {
  await del(url);
}
