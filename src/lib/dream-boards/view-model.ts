import type { getDreamBoardBySlug } from '@/lib/db/queries';

import { getCauseById } from './causes';
import { getOverflowState } from './overflow';

type DreamBoardRecord = NonNullable<Awaited<ReturnType<typeof getDreamBoardBySlug>>>;

type TakealotGiftData = {
  productName: string;
  productImage: string;
};

type PhilanthropyGiftData = {
  causeName: string;
  causeImage: string;
  impactDescription: string;
};

export type OverflowGiftData = {
  causeId: string;
  causeName: string;
  impactDescription: string;
};

type GuestViewModelOptions = {
  takealotSubtitle?: string;
  now?: Date;
};

export type GuestViewModel = {
  childName: string;
  childPhotoUrl: string;
  slug: string;
  giftType: DreamBoardRecord['giftType'];
  giftTitle: string;
  giftSubtitle: string;
  giftImage: string;
  overflowTitle: string;
  overflowSubtitle: string;
  overflowImage: string;
  overflowData: OverflowGiftData | null;
  funded: boolean;
  showCharityOverflow: boolean;
  displayTitle: string;
  displaySubtitle: string;
  displayImage: string;
  isClosed: boolean;
  percentage: number;
  daysLeft: number;
  contributionCount: number;
  raisedCents: number;
  goalCents: number;
  message: string | null;
};

const getDaysLeftFrom = (deadline: Date, now: Date) => {
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getGiftInfo = (board: DreamBoardRecord, options: GuestViewModelOptions) => {
  const takealotGift =
    board.giftType === 'takealot_product' ? (board.giftData as TakealotGiftData) : null;
  const philanthropyGift =
    board.giftType === 'philanthropy' ? (board.giftData as PhilanthropyGiftData) : null;

  return {
    giftTitle: takealotGift?.productName ?? philanthropyGift?.causeName ?? '',
    giftSubtitle: takealotGift
      ? (options.takealotSubtitle ?? 'Dream gift')
      : (philanthropyGift?.impactDescription ?? ''),
    giftImage: takealotGift?.productImage ?? philanthropyGift?.causeImage ?? '',
  };
};

const getOverflowInfo = (board: DreamBoardRecord) => {
  const overflowData = board.overflowGiftData as OverflowGiftData | null;
  const overflowCause = overflowData ? getCauseById(overflowData.causeId) : null;

  return {
    overflowData,
    overflowTitle: overflowData?.causeName ?? '',
    overflowSubtitle: overflowData?.impactDescription ?? '',
    overflowImage: overflowCause?.imageUrl ?? board.childPhotoUrl,
  };
};

const getDisplayInfo = (params: {
  showCharityOverflow: boolean;
  giftTitle: string;
  giftSubtitle: string;
  giftImage: string;
  overflowTitle: string;
  overflowSubtitle: string;
  overflowImage: string;
  fallbackImage: string;
}) => {
  if (params.showCharityOverflow) {
    return {
      displayTitle: params.overflowTitle,
      displaySubtitle: params.overflowSubtitle,
      displayImage: params.overflowImage,
    };
  }

  return {
    displayTitle: params.giftTitle,
    displaySubtitle: params.giftSubtitle,
    displayImage: params.giftImage || params.fallbackImage,
  };
};

export const buildGuestViewModel = (
  board: DreamBoardRecord,
  options: GuestViewModelOptions = {}
): GuestViewModel => {
  const now = options.now ?? new Date();
  const { giftTitle, giftSubtitle, giftImage } = getGiftInfo(board, options);
  const { overflowData, overflowTitle, overflowSubtitle, overflowImage } = getOverflowInfo(board);

  const { funded, showCharityOverflow } = getOverflowState({
    raisedCents: board.raisedCents,
    goalCents: board.goalCents,
    giftType: board.giftType,
    overflowGiftData: overflowData,
  });

  const { displayTitle, displaySubtitle, displayImage } = getDisplayInfo({
    showCharityOverflow,
    giftTitle,
    giftSubtitle,
    giftImage,
    overflowTitle,
    overflowSubtitle,
    overflowImage,
    fallbackImage: board.childPhotoUrl,
  });

  return {
    childName: board.childName,
    childPhotoUrl: board.childPhotoUrl,
    slug: board.slug,
    giftType: board.giftType,
    giftTitle,
    giftSubtitle,
    giftImage,
    overflowTitle,
    overflowSubtitle,
    overflowImage,
    overflowData,
    funded,
    showCharityOverflow,
    displayTitle,
    displaySubtitle,
    displayImage,
    isClosed: board.status !== 'active' && board.status !== 'funded',
    percentage: Math.min(100, Math.round((board.raisedCents / board.goalCents) * 100)),
    daysLeft: getDaysLeftFrom(new Date(board.deadline), now),
    contributionCount: board.contributionCount,
    raisedCents: board.raisedCents,
    goalCents: board.goalCents,
    message: board.message ?? null,
  };
};
