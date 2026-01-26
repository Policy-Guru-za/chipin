import { NextRequest } from 'next/server';

import { enforceApiAuth } from '@/lib/api/handler';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { isValidUuid } from '@/lib/api/validation';
import { deactivateWebhookEndpoint } from '@/lib/db/api-queries';
import { markApiKeyUsed } from '@/lib/db/queries';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await enforceApiAuth(request, 'webhooks:manage');
  if (!auth.ok) return auth.response;
  const { requestId, apiKey, rateLimitHeaders } = auth.context;

  if (!isValidUuid(params.id)) {
    return jsonError({
      error: { code: 'validation_error', message: 'Invalid webhook identifier' },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const updated = await deactivateWebhookEndpoint({ id: params.id, apiKeyId: apiKey.id });
  if (!updated) {
    return jsonError({
      error: { code: 'not_found', message: 'Webhook endpoint not found' },
      status: 404,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  await markApiKeyUsed(apiKey.id);

  return jsonSuccess({ data: { id: updated.id }, requestId, headers: rateLimitHeaders });
}
