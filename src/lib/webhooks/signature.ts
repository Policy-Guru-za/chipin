import crypto from 'crypto';

export const generateWebhookSignature = (
  payload: string,
  secret: string,
  timestamp: number
): string => {
  const signedPayload = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
};

export const buildWebhookHeaders = (
  payload: string,
  secret: string,
  eventId?: string
): Record<string, string> => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateWebhookSignature(payload, secret, timestamp);

  return {
    'Content-Type': 'application/json',
    'X-ChipIn-Signature': `t=${timestamp},v1=${signature}`,
    'X-ChipIn-Event-Id': eventId ?? crypto.randomUUID(),
  };
};
