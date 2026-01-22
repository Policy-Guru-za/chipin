import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { ContributorChips } from '@/components/dream-board/ContributorChips';
import { DreamBoardCard } from '@/components/dream-board/DreamBoardCard';
import { ProgressBar } from '@/components/dream-board/ProgressBar';
import { Button } from '@/components/ui/button';
import { getDreamBoardBySlug, listRecentContributors } from '@/lib/db/queries';
import { getCauseById } from '@/lib/dream-boards/causes';
import { formatZar } from '@/lib/utils/money';

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

type DreamBoardRecord = NonNullable<Awaited<ReturnType<typeof getDreamBoardBySlug>>>;

type GuestViewModel = {
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
  isClosed: boolean;
  showCharityOverflow: boolean;
  percentage: number;
  daysLeft: number;
  contributionCount: number;
  raisedCents: number;
  goalCents: number;
  message: string | null;
};

type Contributor = Awaited<ReturnType<typeof listRecentContributors>>[number];

const toAbsoluteUrl = (url: string, baseUrl: string) => {
  try {
    return new URL(url).toString();
  } catch {
    return new URL(url, baseUrl).toString();
  }
};

const getBoard = cache(async (slug: string) => getDreamBoardBySlug(slug));

const getDaysLeft = (deadline: Date) => {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getTakealotGift = (board: DreamBoardRecord) =>
  board.giftType === 'takealot_product' ? (board.giftData as TakealotGiftData) : null;

const getPhilanthropyGift = (board: DreamBoardRecord) =>
  board.giftType === 'philanthropy' ? (board.giftData as PhilanthropyGiftData) : null;

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
    return 'Her dream gift';
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

const getOverflowInfo = (board: DreamBoardRecord, overflowData: OverflowGiftData | null) => {
  const overflowCause = overflowData ? getCauseById(overflowData.causeId) : null;

  return {
    overflowTitle: overflowData?.causeName ?? '',
    overflowSubtitle: overflowData?.impactDescription ?? '',
    overflowImage: overflowCause?.imageUrl ?? board.childPhotoUrl,
  };
};

const buildGuestViewModel = (board: DreamBoardRecord): GuestViewModel => {
  const takealotGift = getTakealotGift(board);
  const philanthropyGift = getPhilanthropyGift(board);
  const giftTitle = getGiftTitle(takealotGift, philanthropyGift);
  const giftSubtitle = getGiftSubtitle(takealotGift, philanthropyGift);
  const giftImage = getGiftImage(takealotGift, philanthropyGift);
  const overflowData = board.overflowGiftData as OverflowGiftData | null;
  const { overflowTitle, overflowSubtitle, overflowImage } = getOverflowInfo(board, overflowData);

  const funded = board.raisedCents >= board.goalCents;
  const showCharityOverflow =
    funded && board.giftType === 'takealot_product' && Boolean(overflowData);

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
    isClosed: board.status !== 'active' && board.status !== 'funded',
    showCharityOverflow,
    percentage: Math.min(100, Math.round((board.raisedCents / board.goalCents) * 100)),
    daysLeft: getDaysLeft(new Date(board.deadline)),
    contributionCount: board.contributionCount,
    raisedCents: board.raisedCents,
    goalCents: board.goalCents,
    message: board.message ?? null,
  };
};

const getHeroCopy = (view: GuestViewModel) => {
  if (view.showCharityOverflow) {
    return {
      title: 'Gift fully funded!',
      subtitle: `${view.childName} chose to support a charity next.`,
    };
  }

  return {
    title: 'Help make this gift happen',
    subtitle: '',
  };
};

const getMetadataDescription = (board: DreamBoardRecord, view: GuestViewModel) => {
  if (view.showCharityOverflow && view.overflowData) {
    return `Gift funded. Contributions now support ${view.overflowData.causeName}: ${view.overflowData.impactDescription}.`;
  }

  if (board.giftType === 'takealot_product') {
    return `Chip in for ${board.childName}'s ${view.giftTitle}.`;
  }

  return `Support ${view.giftTitle} for ${board.childName}.`;
};

const getMetadataImage = (view: GuestViewModel, baseUrl: string, fallback: string) => {
  const imageCandidate = view.showCharityOverflow ? view.overflowImage : view.giftImage || fallback;
  return imageCandidate ? toAbsoluteUrl(imageCandidate, baseUrl) : undefined;
};

const buildMetadataForBoard = (board: DreamBoardRecord, baseUrl: string): Metadata => {
  const view = buildGuestViewModel(board);
  const title = `${board.childName}'s Dream Board | ChipIn`;
  const description = getMetadataDescription(board, view);
  const imageUrl = getMetadataImage(view, baseUrl, board.childPhotoUrl);
  const url = `${baseUrl}/${board.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
};

const HeroCard = ({ view }: { view: GuestViewModel }) => {
  const heroCopy = getHeroCopy(view);

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-white p-6 text-center shadow-soft">
      <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lifted">
        <Image
          src={view.childPhotoUrl}
          alt={view.childName}
          fill
          sizes="128px"
          className="object-cover"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
          {view.childName}&apos;s Dream Board
        </p>
        <h1 className="text-3xl font-display text-text">{heroCopy.title}</h1>
        {heroCopy.subtitle ? <p className="text-sm text-text-muted">{heroCopy.subtitle}</p> : null}
      </div>
    </div>
  );
};

const GiftCardSection = ({ view }: { view: GuestViewModel }) => {
  const cardContent = view.showCharityOverflow
    ? {
        imageUrl: view.overflowImage,
        title: view.overflowTitle,
        subtitle: view.overflowSubtitle,
        tag: 'Charity overflow',
      }
    : {
        imageUrl: view.giftImage,
        title: view.giftTitle,
        subtitle: view.giftSubtitle,
        tag: view.giftType === 'takealot_product' ? 'Dream gift' : 'Gift of giving',
      };

  return (
    <DreamBoardCard
      imageUrl={cardContent.imageUrl}
      title={cardContent.title}
      subtitle={cardContent.subtitle}
      tag={cardContent.tag}
    />
  );
};

const GoalProgressCard = ({ view }: { view: GuestViewModel }) => (
  <div className="space-y-4 rounded-3xl border border-border bg-white p-6">
    <ProgressBar value={view.percentage} />
    <div className="flex items-center justify-between text-sm text-text">
      <span>{view.percentage}% funded</span>
      <span>
        {formatZar(view.raisedCents)} of {formatZar(view.goalCents)}
      </span>
    </div>
    <div className="flex items-center justify-between text-sm text-text-muted">
      <span>{view.daysLeft} days left</span>
      <span>{view.contributionCount} contributions</span>
    </div>
    {view.message ? (
      <p className="rounded-2xl bg-subtle px-4 py-3 text-sm text-text">“{view.message}”</p>
    ) : null}
  </div>
);

const OpenEndedProgressCard = ({ view }: { view: GuestViewModel }) => (
  <div className="space-y-4 rounded-3xl border border-border bg-white p-6">
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
        Charity contributions
      </p>
      <p className="text-2xl font-semibold text-text">
        {formatZar(view.raisedCents)} raised so far{' '}
        <span className="text-sm font-normal text-text-muted">(open-ended)</span>
      </p>
    </div>
    <div className="flex items-center justify-between text-sm text-text-muted">
      <span>{view.daysLeft} days left</span>
      <span>{view.contributionCount} contributions</span>
    </div>
    {view.message ? (
      <p className="rounded-2xl bg-subtle px-4 py-3 text-sm text-text">“{view.message}”</p>
    ) : null}
  </div>
);

const ProgressSection = ({ view }: { view: GuestViewModel }) =>
  view.showCharityOverflow ? (
    <OpenEndedProgressCard view={view} />
  ) : (
    <GoalProgressCard view={view} />
  );

const FundedBanner = ({ view }: { view: GuestViewModel }) => {
  if (!view.funded || !view.overflowData) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-accent/40 bg-accent/10 p-6 text-sm text-text">
      <p className="font-semibold">Gift fully funded!</p>
      <p className="mt-2 text-text-muted">
        Additional contributions will support {view.overflowData.causeName}:{' '}
        {view.overflowData.impactDescription}.
      </p>
    </div>
  );
};

const ContributionCta = ({ view }: { view: GuestViewModel }) => {
  if (view.isClosed) {
    return (
      <div className="rounded-3xl border border-border bg-stone-100 p-6 text-sm text-text">
        This Dream Board is closed to new contributions.
      </div>
    );
  }

  const ctaLabel = view.showCharityOverflow ? 'Contribute to the charity →' : 'Contribute now';

  return (
    <div className="rounded-3xl border border-border bg-white p-6 text-center">
      <Link href={`/${view.slug}/contribute`}>
        <Button className="w-full">{ctaLabel}</Button>
      </Link>
      <p className="mt-3 text-xs text-text-muted">Secure payments powered by PayFast.</p>
    </div>
  );
};

const ContributorsSection = ({ contributors }: { contributors: Contributor[] }) => {
  if (!contributors.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
        Recent supporters
      </p>
      <ContributorChips
        contributors={contributors.map((contributor) => ({
          name: contributor.contributorName || 'Anonymous',
        }))}
      />
    </div>
  );
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const board = await getBoard(params.slug);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!board) {
    return {
      title: 'Dream Board | ChipIn',
      description: 'Chip in together for a dream gift.',
    };
  }

  return buildMetadataForBoard(board, baseUrl);
}

export default async function DreamBoardPage({ params }: { params: { slug: string } }) {
  const board = await getBoard(params.slug);
  if (!board) {
    notFound();
  }
  const view = buildGuestViewModel(board);
  const contributors = await listRecentContributors(board.id, 6);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <HeroCard view={view} />
      <GiftCardSection view={view} />
      <ProgressSection view={view} />
      <FundedBanner view={view} />
      <ContributionCta view={view} />
      <ContributorsSection contributors={contributors} />
    </section>
  );
}
