import { kv } from '@vercel/kv';

const DRAFT_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

export type DreamBoardDraft = {
  childName: string;
  birthdayDate: string;
  childPhotoUrl: string;
  updatedAt: string;
  photoFilename?: string;
};

const draftKey = (hostId: string) => `draft:host:${hostId}`;

export async function saveDreamBoardDraft(
  hostId: string,
  draft: Omit<DreamBoardDraft, 'updatedAt'>
) {
  const payload: DreamBoardDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(draftKey(hostId), payload, { ex: DRAFT_EXPIRY_SECONDS });
  return payload;
}

export async function getDreamBoardDraft(hostId: string) {
  return kv.get<DreamBoardDraft>(draftKey(hostId));
}
