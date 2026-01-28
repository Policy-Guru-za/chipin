export type WebhookEventType =
  | 'dreamboard.created'
  | 'dreamboard.updated'
  | 'contribution.received'
  | 'pot.funded'
  | 'pot.closed'
  | 'payout.ready'
  | 'payout.completed'
  | 'payout.failed';

export type WebhookEventStatus = 'pending' | 'delivered' | 'failed';

export type WebhookEventMeta = {
  enrichment_required?: boolean;
  dream_board_id?: string;
};

export type WebhookEventPayload = {
  id: string;
  type: WebhookEventType;
  created_at: string;
  data: Record<string, unknown>;
  meta?: WebhookEventMeta;
};

export type WebhookDeliveryResult = {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
};

export type WebhookEndpoint = {
  id: string;
  apiKeyId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
};

export type PendingWebhookEvent = {
  id: string;
  apiKeyId: string | null;
  eventType: string;
  payload: WebhookEventPayload;
  status: string;
  attempts: number;
  lastAttemptAt: Date | null;
  lastResponseCode: number | null;
  lastResponseBody: string | null;
  createdAt: Date;
};
