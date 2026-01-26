import {
  overflowGiftSchema,
  philanthropyGiftSchema,
  takealotGiftSchema,
} from '@/lib/dream-boards/schema';
import { getOverflowState } from '@/lib/dream-boards/overflow';

type DreamBoardApiRecord = {
  id: string;
  slug: string;
  childName: string;
  childPhotoUrl: string;
  birthdayDate: Date | string;
  giftType: 'takealot_product' | 'philanthropy';
  giftData: unknown;
  payoutMethod: 'takealot_gift_card' | 'karri_card_topup' | 'philanthropy_donation';
  overflowGiftData: unknown | null;
  goalCents: number;
  raisedCents: number;
  message: string | null;
  deadline: Date | string;
  status: string;
  contributionCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const toDateOnly = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split('T')[0];
};

const toIsoString = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const serializeGiftData = (board: DreamBoardApiRecord) => {
  if (board.giftType === 'takealot_product') {
    const parsed = takealotGiftSchema.safeParse(board.giftData);
    if (!parsed.success) return null;
    return {
      product_url: parsed.data.productUrl,
      product_name: parsed.data.productName,
      product_image: parsed.data.productImage,
      product_price: parsed.data.productPrice,
    };
  }

  const parsed = philanthropyGiftSchema.safeParse(board.giftData);
  if (!parsed.success) return null;
  return {
    cause_id: parsed.data.causeId,
    cause_name: parsed.data.causeName,
    impact_description: parsed.data.impactDescription,
    amount_cents: parsed.data.amountCents,
  };
};

const serializeOverflowGiftData = (overflowGiftData: unknown | null) => {
  if (!overflowGiftData) return null;
  const parsed = overflowGiftSchema.safeParse(overflowGiftData);
  if (!parsed.success) return null;
  return {
    cause_id: parsed.data.causeId,
    cause_name: parsed.data.causeName,
    impact_description: parsed.data.impactDescription,
  };
};

/** Serialize a dream board record into the public API response shape. */
export const serializeDreamBoard = (board: DreamBoardApiRecord, baseUrl: string) => {
  const giftData = serializeGiftData(board);
  if (!giftData) return null;

  const overflowGiftData = serializeOverflowGiftData(board.overflowGiftData);
  const { showCharityOverflow } = getOverflowState({
    raisedCents: board.raisedCents,
    goalCents: board.goalCents,
    giftType: board.giftType,
    overflowGiftData: overflowGiftData
      ? {
          causeId: overflowGiftData.cause_id,
          causeName: overflowGiftData.cause_name,
          impactDescription: overflowGiftData.impact_description,
        }
      : null,
  });

  const publicUrl = `${ensureTrailingSlash(baseUrl)}${board.slug}`;
  const overflowCents = Math.max(0, board.raisedCents - board.goalCents);

  return {
    id: board.id,
    slug: board.slug,
    child_name: board.childName,
    child_photo_url: board.childPhotoUrl,
    birthday_date: toDateOnly(board.birthdayDate),
    gift_type: board.giftType,
    gift_data: giftData,
    payout_method: board.payoutMethod,
    overflow_gift_data: overflowGiftData,
    goal_cents: board.goalCents,
    raised_cents: board.raisedCents,
    overflow_cents: overflowCents,
    message: board.message,
    deadline: toIsoString(board.deadline),
    status: board.status,
    display_mode: showCharityOverflow ? 'charity' : 'gift',
    contribution_count: board.contributionCount,
    public_url: publicUrl,
    created_at: toIsoString(board.createdAt),
    updated_at: toIsoString(board.updatedAt),
  };
};
