import type { getContributionByPaymentRef, getDreamBoardBySlug } from '@/lib/db/queries';

import { formatZar } from '@/lib/utils/money';

import { getCauseById } from './causes';
import { getGiftInfo } from './gift-info';
import { getOverflowState } from './overflow';

type DreamBoardRecord = NonNullable<Awaited<ReturnType<typeof getDreamBoardBySlug>>>;
type ContributionRecord = Awaited<ReturnType<typeof getContributionByPaymentRef>>;

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

export type ContributionViewModel = GuestViewModel & {
  headline: string;
  cardTag?: string;
  overflowNoticeTitle?: string;
  overflowNoticeBody?: string;
};

export type ThankYouViewModel = {
  headline: string;
  message: string;
  percentage: number;
  raisedLabel: string;
  goalLabel: string;
  shareHref: string;
  contributeHref: string;
};

const getDaysLeftFrom = (deadline: Date, now: Date) => {
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

const getContributionHeadline = (view: GuestViewModel) =>
  view.showCharityOverflow
    ? `Support ${view.overflowTitle}`
    : `Contribute to ${view.childName}'s gift`;

const getOverflowNotice = (view: GuestViewModel) => {
  if (!view.showCharityOverflow || !view.overflowData) return undefined;
  return `Contributions now support ${view.overflowData.causeName}: ${view.overflowData.impactDescription}.`;
};

const getContributorName = (contribution?: ContributionRecord | null) =>
  contribution?.contributorName || 'Friend';

const getContributionAmountLabel = (contribution?: ContributionRecord | null) =>
  contribution?.amountCents ? formatZar(contribution.amountCents) : null;

const getThankYouMessage = (params: {
  board: DreamBoardRecord;
  giftTitle: string;
  giftSubtitle: string;
  amountLabel: string | null;
  isComplete: boolean;
  overflowData: OverflowGiftData | null;
  showCharityOverflow: boolean;
}) => {
  if (!params.amountLabel || !params.isComplete) {
    return 'We’ll update this page once your payment is confirmed.';
  }

  if (params.showCharityOverflow && params.overflowData) {
    const impact = params.overflowData.impactDescription
      ? `: ${params.overflowData.impactDescription}`
      : '';
    return `Your ${params.amountLabel} contribution is supporting ${params.overflowData.causeName}${impact}.`;
  }

  if (params.board.giftType === 'philanthropy') {
    const impact = params.giftSubtitle ? `: ${params.giftSubtitle}` : '';
    const title = params.giftTitle || 'this cause';
    return `Your ${params.amountLabel} contribution is supporting ${title}${impact}.`;
  }

  return `Your ${params.amountLabel} contribution is helping ${params.board.childName} get their dream gift.`;
};

const getThankYouCopy = (params: {
  board: DreamBoardRecord;
  contribution?: ContributionRecord | null;
}) => {
  const name = getContributorName(params.contribution);
  const amountLabel = getContributionAmountLabel(params.contribution);
  const isComplete = params.contribution?.paymentStatus === 'completed';

  const { giftTitle, giftSubtitle } = getGiftInfo({
    giftType: params.board.giftType,
    giftData: params.board.giftData,
  });
  const { overflowData } = getOverflowInfo(params.board);
  const { showCharityOverflow } = getOverflowState({
    raisedCents: params.board.raisedCents,
    goalCents: params.board.goalCents,
    giftType: params.board.giftType,
    overflowGiftData: overflowData,
  });

  const thankYouMessage = getThankYouMessage({
    board: params.board,
    giftTitle,
    giftSubtitle,
    amountLabel,
    isComplete,
    overflowData,
    showCharityOverflow,
  });

  return {
    headline: isComplete ? `Thank you, ${name}!` : 'Thanks for your support!',
    message: thankYouMessage,
  };
};

export const buildGuestViewModel = (
  board: DreamBoardRecord,
  options: GuestViewModelOptions = {}
): GuestViewModel => {
  const now = options.now ?? new Date();
  const { giftTitle, giftSubtitle, giftImage } = getGiftInfo({
    giftType: board.giftType,
    giftData: board.giftData,
    takealotSubtitle: options.takealotSubtitle,
  });
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

export const buildContributionViewModel = (board: DreamBoardRecord): ContributionViewModel => {
  const view = buildGuestViewModel(board);
  const overflowNoticeBody = getOverflowNotice(view);

  return {
    ...view,
    headline: getContributionHeadline(view),
    cardTag: view.showCharityOverflow ? 'Charity overflow' : undefined,
    overflowNoticeTitle: overflowNoticeBody ? 'Gift fully funded!' : undefined,
    overflowNoticeBody,
  };
};

export const buildThankYouViewModel = (params: {
  board: DreamBoardRecord;
  contribution?: ContributionRecord | null;
}): ThankYouViewModel => {
  const { headline, message } = getThankYouCopy(params);
  const percentage = Math.min(
    100,
    Math.round((params.board.raisedCents / params.board.goalCents) * 100)
  );

  return {
    headline,
    message,
    percentage,
    raisedLabel: formatZar(params.board.raisedCents),
    goalLabel: formatZar(params.board.goalCents),
    shareHref: `/${params.board.slug}`,
    contributeHref: `/${params.board.slug}/contribute`,
  };
};
