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

const getGiftInfo = (board: DashboardBoard) => {
  const takealotResult =
    board.giftType === 'takealot_product' ? takealotGiftSchema.safeParse(board.giftData) : null;
  const philanthropyResult =
    board.giftType === 'philanthropy' ? philanthropyGiftSchema.safeParse(board.giftData) : null;

  const takealotGift: TakealotGiftData | null = takealotResult?.success
    ? takealotResult.data
    : null;
  const philanthropyGift: PhilanthropyGiftData | null = philanthropyResult?.success
    ? philanthropyResult.data
    : null;

  const giftTitle = takealotGift?.productName ?? philanthropyGift?.causeName ?? '';
  const giftSubtitle = takealotGift ? 'Dream gift' : (philanthropyGift?.impactDescription ?? '');
  const giftImage =
    takealotGift?.productImage ?? philanthropyGift?.causeImage ?? board.childPhotoUrl;

  return {
    giftTitle,
    giftSubtitle,
    giftImage,
  };
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
