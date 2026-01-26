import { NextRequest } from 'next/server';

import { validateUuid, withApiAuth } from '@/lib/api/route-utils';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { deactivateWebhookEndpoint } from '@/lib/db/api-queries';

export const DELETE = withApiAuth(
  'webhooks:manage',
  async (_request: NextRequest, context, params: { id: string }) => {
    const { requestId, apiKey, rateLimitHeaders } = context;

    const idCheck = validateUuid(params.id, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid webhook identifier',
    });
    if (!idCheck.ok) return idCheck.response;

    const updated = await deactivateWebhookEndpoint({ id: params.id, apiKeyId: apiKey.id });
    if (!updated) {
      return jsonError({
        error: { code: 'not_found', message: 'Webhook endpoint not found' },
        status: 404,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    return jsonSuccess({ data: { id: updated.id }, requestId, headers: rateLimitHeaders });
  }
);
