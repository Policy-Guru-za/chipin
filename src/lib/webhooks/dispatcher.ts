import crypto from 'crypto';

import { log } from '@/lib/observability/logger';
import { decryptSensitiveValue } from '@/lib/utils/encryption';
import { WEBHOOK_DELIVERY_TIMEOUT_MS } from '@/lib/constants/webhooks';
import { buildDreamBoardWebhookData } from '@/lib/webhooks/payloads';
import { buildWebhookHeaders } from './signature';
import {
  createWebhookEvent,
  getActiveApiKeysForPartner,
  getActiveEndpointsForEvent,
  getPendingWebhookEvents,
  markEventDelivered,
  markEventFailed,
  updateWebhookEventPayload,
} from './queries';
import type {
  PendingWebhookEvent,
  WebhookDeliveryResult,
  WebhookEndpoint,
  WebhookEventPayload,
  WebhookEventType,
} from './types';

const buildDeliveryPayload = (payload: WebhookEventPayload): WebhookEventPayload => {
  const { meta, ...rest } = payload;
  return rest;
};

const resolveWebhookPayload = async (
  event: PendingWebhookEvent
): Promise<WebhookEventPayload | null> => {
  const meta = event.payload.meta;
  if (!meta?.enrichment_required) {
    return event.payload;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const dreamBoardId = meta.dream_board_id;

  if (!dreamBoardId) {
    log('warn', 'webhooks.payload_missing_dream_board', { eventId: event.id });
    return null;
  }

  const dreamBoardPayload = await buildDreamBoardWebhookData(dreamBoardId, baseUrl);
  if (!dreamBoardPayload) {
    log('warn', 'webhooks.payload_enrichment_failed', { eventId: event.id, dreamBoardId });
    return null;
  }

  let data: Record<string, unknown>;

  if (event.payload.type === 'contribution.received') {
    const contribution = (event.payload.data as { contribution?: unknown }).contribution;
    if (!contribution) {
      log('warn', 'webhooks.payload_missing_contribution', { eventId: event.id });
      return null;
    }

    data = { contribution, dream_board: dreamBoardPayload };
  } else if (event.payload.type === 'pot.funded') {
    data = dreamBoardPayload;
  } else {
    data = event.payload.data;
  }

  const enrichedPayload: WebhookEventPayload = {
    id: event.payload.id,
    type: event.payload.type,
    created_at: event.payload.created_at,
    data,
  };

  await updateWebhookEventPayload(event.id, enrichedPayload);
  return enrichedPayload;
};

const deliverToEndpoint = async (
  endpoint: WebhookEndpoint,
  payload: WebhookEventPayload
): Promise<WebhookDeliveryResult> => {
  const body = JSON.stringify(payload);
  let secret: string;

  try {
    secret = decryptSensitiveValue(endpoint.secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Secret decrypt failed: ${message}` };
  }

  const headers = buildWebhookHeaders(body, secret, payload.id);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_DELIVERY_TIMEOUT_MS);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      return { success: true, statusCode: response.status, responseBody };
    }

    return {
      success: false,
      statusCode: response.status,
      responseBody,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const emitWebhookEvent = async (
  apiKeyId: string | null,
  type: WebhookEventType,
  data: Record<string, unknown>,
  meta?: WebhookEventPayload['meta']
): Promise<string | null> => {
  const payload: WebhookEventPayload = {
    id: crypto.randomUUID(),
    type,
    created_at: new Date().toISOString(),
    data,
    meta,
  };

  try {
    const eventId = await createWebhookEvent(apiKeyId, payload);
    log('info', 'webhooks.event_created', { eventId, type, apiKeyId });
    return eventId;
  } catch (error) {
    log('error', 'webhooks.event_create_failed', {
      type,
      apiKeyId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
};

const processEvent = async (event: PendingWebhookEvent): Promise<void> => {
  if (!event.apiKeyId) {
    log('warn', 'webhooks.event_no_api_key', { eventId: event.id });
    await markEventFailed(event.id, null, 'No API key associated');
    return;
  }

  const payload = await resolveWebhookPayload(event);
  if (!payload) {
    await markEventFailed(event.id, null, 'payload_enrichment_failed');
    return;
  }

  const endpoints = await getActiveEndpointsForEvent(event.apiKeyId, event.eventType);

  if (endpoints.length === 0) {
    log('info', 'webhooks.no_endpoints', { eventId: event.id, eventType: event.eventType });
    await markEventDelivered(event.id);
    return;
  }

  let anySuccess = false;
  let lastError: string | null = null;
  let lastStatusCode: number | null = null;

  let allSucceeded = true;

  for (const endpoint of endpoints) {
    const result = await deliverToEndpoint(endpoint, buildDeliveryPayload(payload));

    log('info', 'webhooks.delivery_attempt', {
      eventId: event.id,
      endpointId: endpoint.id,
      success: result.success,
      statusCode: result.statusCode,
    });

    if (result.success) {
      anySuccess = true;
    } else {
      allSucceeded = false;
      lastError = result.responseBody ?? result.error ?? null;
      lastStatusCode = result.statusCode ?? null;
    }
  }

  if (allSucceeded && anySuccess) {
    await markEventDelivered(event.id);
  } else {
    await markEventFailed(event.id, lastStatusCode, lastError);
  }
};

export const processWebhookQueue = async (limit = 50): Promise<number> => {
  const events = await getPendingWebhookEvents(limit);

  if (events.length === 0) {
    return 0;
  }

  log('info', 'webhooks.processing_batch', { count: events.length });

  for (const event of events) {
    await processEvent(event);
  }

  return events.length;
};

export const emitWebhookEventForPartner = async (
  partnerId: string,
  type: WebhookEventType,
  data: Record<string, unknown>,
  meta?: WebhookEventPayload['meta']
): Promise<string[] | null> => {
  try {
    const apiKeyIds = await getActiveApiKeysForPartner(partnerId);
    if (apiKeyIds.length === 0) {
      log('warn', 'webhooks.emit_no_api_keys', { partnerId, type });
      return null;
    }

    const eventIds = await Promise.all(
      apiKeyIds.map((apiKeyId) => emitWebhookEvent(apiKeyId, type, data, meta))
    );

    return eventIds.filter((eventId): eventId is string => Boolean(eventId));
  } catch (error) {
    log('error', 'webhooks.emit_failed', {
      partnerId,
      type,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
};
