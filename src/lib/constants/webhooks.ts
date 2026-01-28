export const WEBHOOK_MAX_ATTEMPTS = 7;
export const WEBHOOK_RETRY_MINUTES = [0, 1, 5, 30, 120, 720, 1440] as const;
export const WEBHOOK_DELIVERY_TIMEOUT_MS = 10_000;
export const WEBHOOK_RESPONSE_BODY_LIMIT = 1000;
export const WEBHOOK_PROCESS_RATE_LIMIT = {
  limit: 60,
  windowSeconds: 60,
} as const;
