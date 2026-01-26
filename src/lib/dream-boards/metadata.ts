import type { Metadata } from 'next';

import { getCauseById } from './causes';
import { getGiftInfo } from './gift-info';

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

const getOverflowInfo = (board: DreamBoardMetadataSource) => {
  const overflowData = board.overflowGiftData as OverflowGiftData | null;
  const funded = board.raisedCents >= board.goalCents;
  const showCharityOverflow =
    funded && board.giftType === 'takealot_product' && Boolean(overflowData);
  const overflowCause = overflowData ? getCauseById(overflowData.causeId) : null;
  const overflowImage = overflowCause?.imageUrl ?? board.childPhotoUrl;

  return {
    overflowData,
    showCharityOverflow,
    overflowImage,
  };
};

const getMetadataImage = (params: {
  showCharityOverflow: boolean;
  overflowImage: string;
  giftImage: string;
  fallbackImage: string;
}) =>
  params.showCharityOverflow ? params.overflowImage : params.giftImage || params.fallbackImage;

const getAltText = (params: {
  showCharityOverflow: boolean;
  overflowData: OverflowGiftData | null;
  giftSubtitle: string;
  title: string;
}) =>
  params.showCharityOverflow
    ? (params.overflowData?.impactDescription ?? params.overflowData?.causeName ?? params.title)
    : params.giftSubtitle || params.title;

export const buildDreamBoardMetadata = (
  board: DreamBoardMetadataSource,
  options: MetadataOptions
): Metadata => {
  const { giftTitle, giftSubtitle, giftImage } = getGiftInfo({
    giftType: board.giftType,
    giftData: board.giftData,
  });
  const { overflowData, showCharityOverflow, overflowImage } = getOverflowInfo(board);

  const title = `${board.childName}'s Dream Board | ChipIn`;
  const description = getMetadataDescription(board, showCharityOverflow, giftTitle, overflowData);
  const imageCandidate = getMetadataImage({
    showCharityOverflow,
    overflowImage,
    giftImage,
    fallbackImage: board.childPhotoUrl,
  });
  const imageUrl = imageCandidate ? toAbsoluteUrl(imageCandidate, options.baseUrl) : undefined;
  const altText = getAltText({
    showCharityOverflow,
    overflowData,
    giftSubtitle,
    title,
  });
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
