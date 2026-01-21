import { kv } from '@vercel/kv';

const DRAFT_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

export type DreamBoardGiftType = 'takealot_product' | 'philanthropy';

export type TakealotGiftData = {
  type: 'takealot_product';
  productUrl: string;
  productName: string;
  productImage: string;
  productPrice: number;
};

export type PhilanthropyGiftData = {
  type: 'philanthropy';
  causeId: string;
  causeName: string;
  causeDescription: string;
  causeImage: string;
  impactDescription: string;
  amountCents: number;
};

export type OverflowGiftData = {
  causeId: string;
  causeName: string;
  impactDescription: string;
};

export type DreamBoardDraftInput = {
  childName?: string;
  birthdayDate?: string;
  childPhotoUrl?: string;
  photoFilename?: string;
  giftType?: DreamBoardGiftType;
  giftData?: TakealotGiftData | PhilanthropyGiftData;
  overflowGiftData?: OverflowGiftData;
  goalCents?: number;
  payoutEmail?: string;
  payoutMethod?: 'takealot_gift_card' | 'karri_card_topup' | 'philanthropy_donation';
  message?: string;
  deadline?: string;
};

export type DreamBoardDraft = {
  childName?: string;
  birthdayDate?: string;
  childPhotoUrl?: string;
  photoFilename?: string;
  giftType?: DreamBoardGiftType;
  giftData?: TakealotGiftData | PhilanthropyGiftData;
  overflowGiftData?: OverflowGiftData;
  goalCents?: number;
  payoutEmail?: string;
  payoutMethod?: 'takealot_gift_card' | 'karri_card_topup' | 'philanthropy_donation';
  message?: string;
  deadline?: string;
  updatedAt: string;
};

const draftKey = (hostId: string) => `draft:host:${hostId}`;

export async function updateDreamBoardDraft(hostId: string, draft: DreamBoardDraftInput) {
  const existing = await getDreamBoardDraft(hostId);
  const payload: DreamBoardDraft = {
    ...(existing ?? {}),
    ...draft,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(draftKey(hostId), payload, { ex: DRAFT_EXPIRY_SECONDS });
  return payload;
}

export async function saveDreamBoardDraft(hostId: string, draft: DreamBoardDraftInput) {
  return updateDreamBoardDraft(hostId, draft);
}

export async function getDreamBoardDraft(hostId: string) {
  return kv.get<DreamBoardDraft>(draftKey(hostId));
}

export async function clearDreamBoardDraft(hostId: string) {
  await kv.del(draftKey(hostId));
}
