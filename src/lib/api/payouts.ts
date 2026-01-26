import { decryptSensitiveValue } from '@/lib/utils/encryption';
import { serializeGiftData, serializeOverflowGiftData } from '@/lib/api/gifts';

type PayoutApiRecord = {
  id: string;
  dreamBoardId: string;
  type: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
  recipientData: unknown;
  status: string;
  externalRef: string | null;
  errorMessage: string | null;
  createdAt: Date | string;
  completedAt: Date | string | null;
};

const toIsoString = (value: Date | string | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

const getCardLast4 = (encrypted?: string | null) => {
  if (!encrypted) return null;
  try {
    const decrypted = decryptSensitiveValue(encrypted);
    return decrypted.slice(-4);
  } catch {
    return null;
  }
};

const serializeRecipientBasics = (record: Record<string, unknown>) => {
  const payload: Record<string, unknown> = {};
  if (typeof record.email === 'string') payload.email = record.email;
  if (typeof record.donorEmail === 'string') payload.donor_email = record.donorEmail;
  if (typeof record.donorName === 'string') payload.donor_name = record.donorName;
  if (typeof record.childName === 'string') payload.child_name = record.childName;
  if (typeof record.payoutMethod === 'string') payload.payout_method = record.payoutMethod;
  if (typeof record.giftType === 'string') payload.gift_type = record.giftType;
  if (typeof record.productUrl === 'string') payload.product_url = record.productUrl;
  if (typeof record.causeId === 'string') payload.cause_id = record.causeId;
  return payload;
};

const serializeRecipientGiftData = (record: Record<string, unknown>) => {
  if (!record.giftData || typeof record.giftData !== 'object') return {};
  const giftType = typeof record.giftType === 'string' ? record.giftType : 'takealot_product';
  return { gift_data: serializeGiftData({ giftType, giftData: record.giftData }) };
};

const serializeRecipientOverflowData = (record: Record<string, unknown>) => {
  if (!record.overflowGiftData || typeof record.overflowGiftData !== 'object') return {};
  return { overflow_gift_data: serializeOverflowGiftData(record.overflowGiftData) };
};

const serializeRecipientCardData = (record: Record<string, unknown>) => {
  if (typeof record.cardNumberEncrypted !== 'string') return {};
  const last4 = getCardLast4(record.cardNumberEncrypted);
  return {
    card_number_last4: last4,
    card_number_masked: last4 ? `****${last4}` : null,
  };
};

const serializeRecipientData = (recipientData: unknown) => {
  if (!recipientData || typeof recipientData !== 'object') return null;
  const record = recipientData as Record<string, unknown>;
  return {
    ...serializeRecipientBasics(record),
    ...serializeRecipientGiftData(record),
    ...serializeRecipientOverflowData(record),
    ...serializeRecipientCardData(record),
  };
};

export const serializePayout = (record: PayoutApiRecord) => ({
  id: record.id,
  dream_board_id: record.dreamBoardId,
  type: record.type,
  gross_cents: record.grossCents,
  fee_cents: record.feeCents,
  net_cents: record.netCents,
  recipient_data: serializeRecipientData(record.recipientData),
  status: record.status,
  external_ref: record.externalRef,
  error_message: record.errorMessage,
  created_at: toIsoString(record.createdAt),
  completed_at: toIsoString(record.completedAt),
});
