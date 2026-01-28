import { and, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { apiKeys, webhookEndpoints, webhookEvents } from '@/lib/db/schema';
import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_RESPONSE_BODY_LIMIT,
  WEBHOOK_RETRY_MINUTES,
} from '@/lib/constants/webhooks';
import type { PendingWebhookEvent, WebhookEndpoint, WebhookEventPayload } from './types';

export const getActiveApiKeysForPartner = async (partnerId: string): Promise<string[]> => {
  const keys = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.partnerId, partnerId), eq(apiKeys.isActive, true)));

  return keys.map((key) => key.id);
};

export const createWebhookEvent = async (
  apiKeyId: string | null,
  payload: WebhookEventPayload
): Promise<string> => {
  const [event] = await db
    .insert(webhookEvents)
    .values({
      apiKeyId,
      eventType: payload.type,
      payload,
      status: 'pending',
      attempts: 0,
    })
    .returning({ id: webhookEvents.id });

  return event.id;
};

export const getActiveEndpointsForEvent = async (
  apiKeyId: string,
  eventType: string
): Promise<WebhookEndpoint[]> => {
  const results = await db
    .select({
      id: webhookEndpoints.id,
      apiKeyId: webhookEndpoints.apiKeyId,
      url: webhookEndpoints.url,
      events: webhookEndpoints.events,
      secret: webhookEndpoints.secret,
      isActive: webhookEndpoints.isActive,
    })
    .from(webhookEndpoints)
    .innerJoin(apiKeys, eq(apiKeys.id, webhookEndpoints.apiKeyId))
    .where(
      and(
        eq(webhookEndpoints.apiKeyId, apiKeyId),
        eq(webhookEndpoints.isActive, true),
        eq(apiKeys.isActive, true)
      )
    );

  return results.filter(
    (endpoint) => endpoint.events.includes('*') || endpoint.events.includes(eventType)
  );
};

export const getPendingWebhookEvents = async (limit = 50): Promise<PendingWebhookEvent[]> => {
  const retryCase = sql`
    CASE
      WHEN ${webhookEvents.attempts} = 0 THEN NOW()
      WHEN ${webhookEvents.attempts} = 1 THEN ${webhookEvents.lastAttemptAt} + interval '${WEBHOOK_RETRY_MINUTES[1]} minutes'
      WHEN ${webhookEvents.attempts} = 2 THEN ${webhookEvents.lastAttemptAt} + interval '${WEBHOOK_RETRY_MINUTES[2]} minutes'
      WHEN ${webhookEvents.attempts} = 3 THEN ${webhookEvents.lastAttemptAt} + interval '${WEBHOOK_RETRY_MINUTES[3]} minutes'
      WHEN ${webhookEvents.attempts} = 4 THEN ${webhookEvents.lastAttemptAt} + interval '${WEBHOOK_RETRY_MINUTES[4]} minutes'
      WHEN ${webhookEvents.attempts} = 5 THEN ${webhookEvents.lastAttemptAt} + interval '${WEBHOOK_RETRY_MINUTES[5]} minutes'
      ELSE ${webhookEvents.lastAttemptAt} + interval '${WEBHOOK_RETRY_MINUTES[6]} minutes'
    END
  `;

  return db
    .select({
      id: webhookEvents.id,
      apiKeyId: webhookEvents.apiKeyId,
      eventType: webhookEvents.eventType,
      payload: webhookEvents.payload,
      status: webhookEvents.status,
      attempts: webhookEvents.attempts,
      lastAttemptAt: webhookEvents.lastAttemptAt,
      lastResponseCode: webhookEvents.lastResponseCode,
      lastResponseBody: webhookEvents.lastResponseBody,
      createdAt: webhookEvents.createdAt,
    })
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.status, 'pending'),
        lt(webhookEvents.attempts, WEBHOOK_MAX_ATTEMPTS),
        or(isNull(webhookEvents.lastAttemptAt), sql`${retryCase} <= NOW()`)
      )
    )
    .orderBy(webhookEvents.createdAt)
    .limit(limit) as Promise<PendingWebhookEvent[]>;
};

export const markEventDelivered = async (eventId: string): Promise<void> => {
  await db
    .update(webhookEvents)
    .set({ status: 'delivered', lastAttemptAt: new Date() })
    .where(eq(webhookEvents.id, eventId));
};

export const markEventFailed = async (
  eventId: string,
  responseCode: number | null,
  responseBody: string | null
): Promise<void> => {
  const [event] = await db
    .select({ attempts: webhookEvents.attempts })
    .from(webhookEvents)
    .where(eq(webhookEvents.id, eventId));

  const newAttempts = (event?.attempts ?? 0) + 1;
  const status = newAttempts >= WEBHOOK_MAX_ATTEMPTS ? 'failed' : 'pending';

  await db
    .update(webhookEvents)
    .set({
      status,
      attempts: newAttempts,
      lastAttemptAt: new Date(),
      lastResponseCode: responseCode,
      lastResponseBody: responseBody?.slice(0, WEBHOOK_RESPONSE_BODY_LIMIT) ?? null,
    })
    .where(eq(webhookEvents.id, eventId));
};

export const updateWebhookEventPayload = async (
  eventId: string,
  payload: WebhookEventPayload
): Promise<void> => {
  await db.update(webhookEvents).set({ payload }).where(eq(webhookEvents.id, eventId));
};

export const getWebhookEventsByIds = async (ids: string[]): Promise<PendingWebhookEvent[]> => {
  if (ids.length === 0) return [];

  return db
    .select({
      id: webhookEvents.id,
      apiKeyId: webhookEvents.apiKeyId,
      eventType: webhookEvents.eventType,
      payload: webhookEvents.payload,
      status: webhookEvents.status,
      attempts: webhookEvents.attempts,
      lastAttemptAt: webhookEvents.lastAttemptAt,
      lastResponseCode: webhookEvents.lastResponseCode,
      lastResponseBody: webhookEvents.lastResponseBody,
      createdAt: webhookEvents.createdAt,
    })
    .from(webhookEvents)
    .where(inArray(webhookEvents.id, ids)) as Promise<PendingWebhookEvent[]>;
};
