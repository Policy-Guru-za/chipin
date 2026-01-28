import { NextResponse, type NextRequest } from 'next/server';

import { requireAdminSession } from '@/lib/auth/session';
import { jsonInternalError } from '@/lib/api/internal-response';
import { log } from '@/lib/observability/logger';
import { getPayoutDetail } from '@/lib/payouts/queries';
import { decryptSensitiveBuffer } from '@/lib/utils/encryption';

const allowedTypes = ['receipt', 'certificate'] as const;
type DocumentType = (typeof allowedTypes)[number];

const sanitizeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);

const getFilename = (type: DocumentType, contentType?: string, filename?: string) => {
  if (filename) {
    return sanitizeFilename(filename);
  }

  const extension = contentType?.includes('/') ? contentType.split('/')[1] : 'bin';
  return `${type}.${extension}`;
};

const getDocumentType = (value: string): DocumentType | null =>
  allowedTypes.includes(value as DocumentType) ? (value as DocumentType) : null;

const getDocumentInfo = (recipient: Record<string, unknown>, type: DocumentType) => {
  const prefix = type === 'receipt' ? 'receipt' : 'certificate';
  const url = recipient[`${prefix}Url`];
  if (typeof url !== 'string' || !url) {
    return null;
  }

  return {
    prefix,
    url,
    encrypted: recipient[`${prefix}Encrypted`] === true,
    contentType:
      typeof recipient[`${prefix}ContentType`] === 'string'
        ? (recipient[`${prefix}ContentType`] as string)
        : 'application/octet-stream',
    filename:
      typeof recipient[`${prefix}Filename`] === 'string'
        ? (recipient[`${prefix}Filename`] as string)
        : undefined,
  };
};

const fetchEncryptedDocument = async (params: {
  url: string;
  type: DocumentType;
  contentType: string;
  filename?: string;
  payoutId: string;
}) => {
  try {
    const response = await fetch(params.url);
    if (!response.ok) {
      return { ok: false as const };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const decrypted = decryptSensitiveBuffer(buffer);
    const downloadName = getFilename(params.type, params.contentType, params.filename);

    return {
      ok: true as const,
      body: decrypted,
      contentType: params.contentType,
      downloadName,
    };
  } catch (error) {
    log('error', 'payout_document_download_failed', {
      payoutId: params.payoutId,
      type: params.type,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false as const };
  }
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; type: string } }
) {
  await requireAdminSession();

  const documentType = getDocumentType(params.type);
  if (!documentType) {
    return jsonInternalError({ code: 'not_found', status: 404 });
  }

  const payout = await getPayoutDetail(params.id);
  if (!payout || payout.type !== 'philanthropy_donation') {
    return jsonInternalError({ code: 'not_found', status: 404 });
  }

  const recipient = (payout.recipientData ?? {}) as Record<string, unknown>;
  const documentInfo = getDocumentInfo(recipient, documentType);
  if (!documentInfo) {
    return jsonInternalError({ code: 'not_found', status: 404 });
  }

  if (!documentInfo.encrypted) {
    return NextResponse.redirect(documentInfo.url);
  }

  const downloaded = await fetchEncryptedDocument({
    url: documentInfo.url,
    type: documentType,
    contentType: documentInfo.contentType,
    filename: documentInfo.filename,
    payoutId: payout.id,
  });

  if (!downloaded.ok) {
    return jsonInternalError({ code: 'unavailable', status: 502 });
  }

  return new Response(downloaded.body, {
    headers: {
      'Content-Type': downloaded.contentType,
      'Content-Disposition': `attachment; filename="${downloaded.downloadName}"`,
    },
  });
}
