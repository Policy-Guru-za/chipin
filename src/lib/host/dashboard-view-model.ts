import type { z } from 'zod';

import { getCauseById } from '@/lib/dream-boards/causes';
import { getOverflowState } from '@/lib/dream-boards/overflow';
import {
  overflowGiftSchema,
  philanthropyGiftSchema,
  takealotGiftSchema,
} from '@/lib/dream-boards/schema';
import { formatZar } from '@/lib/utils/money';

type TakealotGiftData = z.infer<typeof takealotGiftSchema>;
type PhilanthropyGiftData = z.infer<typeof philanthropyGiftSchema>;
type OverflowGiftData = z.infer<typeof overflowGiftSchema>;

type DashboardBoard = {
  id: string;
  slug: string;
  childName: string;
  childPhotoUrl: string;
  giftType: 'takealot_product' | 'philanthropy';
  giftData: unknown;
  overflowGiftData?: unknown | null;
  goalCents: number;
  status: string;
  raisedCents: number;
  contributionCount: number;
};

export type DashboardViewModel = {
  boardTitle: string;
  statusLabel: string;
  percentage: number;
  raisedLabel: string;
  contributionCount: number;
  manageHref: string;
  shareUrl?: string;
  displayTitle: string;
  displaySubtitle: string;
  displayImage: string;
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  funded: 'Funded',
  closed: 'Closed',
  paid_out: 'Paid out',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const parseTakealotGift = (board: DashboardBoard): TakealotGiftData | null => {
  if (board.giftType !== 'takealot_product') return null;
  const result = takealotGiftSchema.safeParse(board.giftData);
  return result.success ? result.data : null;
};

const parsePhilanthropyGift = (board: DashboardBoard): PhilanthropyGiftData | null => {
  if (board.giftType !== 'philanthropy') return null;
  const result = philanthropyGiftSchema.safeParse(board.giftData);
  return result.success ? result.data : null;
};

const buildGiftInfo = (params: {
  takealotGift: TakealotGiftData | null;
  philanthropyGift: PhilanthropyGiftData | null;
  fallbackImage: string;
}) => ({
  giftTitle: params.takealotGift?.productName ?? params.philanthropyGift?.causeName ?? '',
  giftSubtitle: params.takealotGift
    ? 'Dream gift'
    : (params.philanthropyGift?.impactDescription ?? ''),
  giftImage:
    params.takealotGift?.productImage ??
    params.philanthropyGift?.causeImage ??
    params.fallbackImage,
});

const getGiftInfo = (board: DashboardBoard) => {
  const takealotGift = parseTakealotGift(board);
  const philanthropyGift = parsePhilanthropyGift(board);
  return buildGiftInfo({
    takealotGift,
    philanthropyGift,
    fallbackImage: board.childPhotoUrl,
  });
};

const getOverflowInfo = (board: DashboardBoard) => {
  const overflowResult = overflowGiftSchema.safeParse(board.overflowGiftData);
  const overflowData: OverflowGiftData | null = overflowResult.success ? overflowResult.data : null;
  const overflowCause = overflowData ? getCauseById(overflowData.causeId) : null;

  return {
    overflowData,
    overflowTitle: overflowData?.causeName ?? '',
    overflowSubtitle: overflowData?.impactDescription ?? '',
    overflowImage: overflowCause?.imageUrl ?? board.childPhotoUrl,
  };
};

export const buildDashboardViewModel = (
  board: DashboardBoard,
  options?: { baseUrl?: string }
): DashboardViewModel => {
  const { giftTitle, giftSubtitle, giftImage } = getGiftInfo(board);
  const { overflowData, overflowTitle, overflowSubtitle, overflowImage } = getOverflowInfo(board);

  const { showCharityOverflow } = getOverflowState({
    raisedCents: board.raisedCents,
    goalCents: board.goalCents,
    giftType: board.giftType,
    overflowGiftData: overflowData,
  });

  const displayTitle = showCharityOverflow ? overflowTitle : giftTitle;
  const displaySubtitle = showCharityOverflow ? overflowSubtitle : giftSubtitle;
  const displayImage = showCharityOverflow ? overflowImage : giftImage;

  return {
    boardTitle: `${board.childName}'s Dream Board`,
    statusLabel: statusLabels[board.status] ?? board.status,
    percentage: Math.min(100, Math.round((board.raisedCents / board.goalCents) * 100)),
    raisedLabel: formatZar(board.raisedCents),
    contributionCount: board.contributionCount,
    manageHref: `/dashboard/${board.id}`,
    shareUrl: options?.baseUrl ? `${options.baseUrl}/${board.slug}` : undefined,
    displayTitle,
    displaySubtitle,
    displayImage,
  };
};
