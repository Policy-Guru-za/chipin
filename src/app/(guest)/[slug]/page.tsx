import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ContributorChips } from '@/components/dream-board/ContributorChips';
import { DreamBoardCard } from '@/components/dream-board/DreamBoardCard';
import { ProgressBar } from '@/components/dream-board/ProgressBar';
import { Button } from '@/components/ui/button';
import { getDreamBoardBySlug, listRecentContributors } from '@/lib/db/queries';
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
  causeName: string;
  impactDescription: string;
};

const getDaysLeft = (deadline: Date) => {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default async function DreamBoardPage({ params }: { params: { slug: string } }) {
  const board = await getDreamBoardBySlug(params.slug);
  if (!board) {
    notFound();
  }

  const giftData = board.giftData as TakealotGiftData | PhilanthropyGiftData;
  const takealotGift =
    board.giftType === 'takealot_product' ? (giftData as TakealotGiftData) : null;
  const philanthropyGift =
    board.giftType === 'philanthropy' ? (giftData as PhilanthropyGiftData) : null;
  const overflowData = board.overflowGiftData as OverflowGiftData | null;
  const percentage = Math.min(100, Math.round((board.raisedCents / board.goalCents) * 100));
  const daysLeft = getDaysLeft(new Date(board.deadline));
  const contributors = await listRecentContributors(board.id, 6);

  const giftTitle = takealotGift ? takealotGift.productName : (philanthropyGift?.causeName ?? '');
  const giftSubtitle = takealotGift
    ? 'Her dream gift'
    : (philanthropyGift?.impactDescription ?? '');
  const giftImage = takealotGift ? takealotGift.productImage : (philanthropyGift?.causeImage ?? '');

  const funded = board.raisedCents >= board.goalCents;
  const isClosed = board.status !== 'active' && board.status !== 'funded';

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-white p-6 text-center shadow-soft">
        <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lifted">
          <Image
            src={board.childPhotoUrl}
            alt={board.childName}
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
            {board.childName}&apos;s Dream Board
          </p>
          <h1 className="text-3xl font-display text-text">Help make this gift happen</h1>
        </div>
      </div>

      <DreamBoardCard
        imageUrl={giftImage}
        title={giftTitle}
        subtitle={giftSubtitle}
        tag={board.giftType === 'takealot_product' ? 'Dream gift' : 'Gift of giving'}
      />

      <div className="space-y-4 rounded-3xl border border-border bg-white p-6">
        <ProgressBar value={percentage} />
        <div className="flex items-center justify-between text-sm text-text">
          <span>{percentage}% funded</span>
          <span>
            {formatZar(board.raisedCents)} of {formatZar(board.goalCents)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>{daysLeft} days left</span>
          <span>{board.contributionCount} contributions</span>
        </div>
        {board.message ? (
          <p className="rounded-2xl bg-subtle px-4 py-3 text-sm text-text">“{board.message}”</p>
        ) : null}
      </div>

      {funded && overflowData ? (
        <div className="rounded-3xl border border-accent/40 bg-accent/10 p-6 text-sm text-text">
          <p className="font-semibold">Gift fully funded!</p>
          <p className="mt-2 text-text-muted">
            Additional contributions will support {overflowData.causeName}:{' '}
            {overflowData.impactDescription}.
          </p>
        </div>
      ) : null}

      {isClosed ? (
        <div className="rounded-3xl border border-border bg-stone-100 p-6 text-sm text-text">
          This Dream Board is closed to new contributions.
        </div>
      ) : null}

      {!isClosed ? (
        <div className="rounded-3xl border border-border bg-white p-6 text-center">
          <Link href={`/${board.slug}/contribute`}>
            <Button className="w-full">Contribute now</Button>
          </Link>
          <p className="mt-3 text-xs text-text-muted">Secure payments powered by PayFast.</p>
        </div>
      ) : null}

      {contributors.length ? (
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
      ) : null}
    </section>
  );
}
