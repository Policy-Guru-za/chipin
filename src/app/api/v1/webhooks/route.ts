import { NextRequest } from 'next/server';
import { z } from 'zod';

import { enforceApiAuth } from '@/lib/api/handler';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { createWebhookEndpoint, listWebhookEndpointsForApiKey } from '@/lib/db/api-queries';
import { markApiKeyUsed } from '@/lib/db/queries';
import { encryptSensitiveValue } from '@/lib/utils/encryption';

const eventSchema = z.enum([
  'dreamboard.created',
  'dreamboard.updated',
  'contribution.received',
  'pot.funded',
  'pot.closed',
  'payout.ready',
  'payout.completed',
  'payout.failed',
]);

const requestSchema = z.object({
  url: z.string().url(),
  events: z.array(eventSchema).min(1),
  secret: z.string().min(8),
});

export async function GET(request: NextRequest) {
  const auth = await enforceApiAuth(request, 'webhooks:manage');
  if (!auth.ok) return auth.response;
  const { requestId, apiKey, rateLimitHeaders } = auth.context;

  const endpoints = await listWebhookEndpointsForApiKey(apiKey.id);
  await markApiKeyUsed(apiKey.id);

  return jsonSuccess({
    data: endpoints.map((endpoint) => ({
      id: endpoint.id,
      url: endpoint.url,
      events: endpoint.events,
      is_active: endpoint.isActive,
      created_at: endpoint.createdAt.toISOString(),
    })),
    requestId,
    headers: rateLimitHeaders,
  });
}

export async function POST(request: NextRequest) {
  const auth = await enforceApiAuth(request, 'webhooks:manage');
  if (!auth.ok) return auth.response;
  const { requestId, apiKey, rateLimitHeaders } = auth.context;

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError({
      error: {
        code: 'validation_error',
        message: 'Invalid webhook payload',
        details: parsed.error.flatten(),
      },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const created = await createWebhookEndpoint({
    apiKeyId: apiKey.id,
    url: parsed.data.url,
    events: Array.from(new Set(parsed.data.events)),
    secret: encryptSensitiveValue(parsed.data.secret),
  });

  if (!created) {
    return jsonError({
      error: { code: 'internal_error', message: 'Unable to create webhook endpoint' },
      status: 500,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  await markApiKeyUsed(apiKey.id);

  return jsonSuccess({
    data: {
      id: created.id,
      url: created.url,
      events: created.events,
      is_active: created.isActive,
      created_at: created.createdAt.toISOString(),
    },
    requestId,
    status: 201,
    headers: rateLimitHeaders,
  });
}
