import type { Metadata } from 'next';

import { getCauseById } from './causes';

type TakealotGiftData = {
  productName: string;
  productImage: string;
};

type PhilanthropyGiftData = {
  causeName: string;
  causeImage: string;
  impactDescription: string;
};

type OverflowGiftData = {
  causeId: string;
  causeName: string;
  impactDescription: string;
};

export type DreamBoardMetadataSource = {
  slug: string;
  childName: string;
  childPhotoUrl: string;
  giftType: 'takealot_product' | 'philanthropy';
  giftData: unknown;
  overflowGiftData: unknown | null;
  goalCents: number;
  raisedCents: number;
};

type MetadataOptions = {
  baseUrl: string;
  path?: string;
};

const toAbsoluteUrl = (url: string, baseUrl: string) => {
  try {
    return new URL(url).toString();
  } catch {
    return new URL(url, baseUrl).toString();
  }
};

const getGiftTitle = (
  takealotGift: TakealotGiftData | null,
  philanthropyGift: PhilanthropyGiftData | null
) => {
  if (takealotGift?.productName) {
    return takealotGift.productName;
  }

  return philanthropyGift?.causeName ?? '';
};

const getGiftSubtitle = (
  takealotGift: TakealotGiftData | null,
  philanthropyGift: PhilanthropyGiftData | null
) => {
  if (takealotGift) {
    return 'Dream gift';
  }

  return philanthropyGift?.impactDescription ?? '';
};

const getGiftImage = (
  takealotGift: TakealotGiftData | null,
  philanthropyGift: PhilanthropyGiftData | null
) => {
  if (takealotGift?.productImage) {
    return takealotGift.productImage;
  }

  return philanthropyGift?.causeImage ?? '';
};

const getMetadataDescription = (
  board: DreamBoardMetadataSource,
  showCharityOverflow: boolean,
  giftTitle: string,
  overflowData: OverflowGiftData | null
) => {
  if (showCharityOverflow && overflowData) {
    return `Gift funded. Contributions now support ${overflowData.causeName}: ${overflowData.impactDescription}.`;
  }

  if (board.giftType === 'takealot_product') {
    return `Chip in for ${board.childName}'s ${giftTitle}.`;
  }

  return `Support ${giftTitle} for ${board.childName}.`;
};

export const buildDreamBoardMetadata = (
  board: DreamBoardMetadataSource,
  options: MetadataOptions
): Metadata => {
  const takealotGift =
    board.giftType === 'takealot_product' ? (board.giftData as TakealotGiftData) : null;
  const philanthropyGift =
    board.giftType === 'philanthropy' ? (board.giftData as PhilanthropyGiftData) : null;
  const giftTitle = getGiftTitle(takealotGift, philanthropyGift);
  const giftSubtitle = getGiftSubtitle(takealotGift, philanthropyGift);
  const giftImage = getGiftImage(takealotGift, philanthropyGift);
  const overflowData = board.overflowGiftData as OverflowGiftData | null;
  const funded = board.raisedCents >= board.goalCents;
  const showCharityOverflow =
    funded && board.giftType === 'takealot_product' && Boolean(overflowData);
  const overflowCause = overflowData ? getCauseById(overflowData.causeId) : null;
  const overflowImage = overflowCause?.imageUrl ?? board.childPhotoUrl;

  const title = `${board.childName}'s Dream Board | ChipIn`;
  const description = getMetadataDescription(board, showCharityOverflow, giftTitle, overflowData);
  const imageCandidate = showCharityOverflow ? overflowImage : giftImage || board.childPhotoUrl;
  const imageUrl = imageCandidate ? toAbsoluteUrl(imageCandidate, options.baseUrl) : undefined;
  const altText = showCharityOverflow
    ? (overflowData?.impactDescription ?? overflowData?.causeName ?? title)
    : giftSubtitle || title;
  const urlPath = options.path ?? `/${board.slug}`;
  const url = toAbsoluteUrl(urlPath, options.baseUrl);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: imageUrl ? [{ url: imageUrl, alt: altText }] : undefined,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
};
