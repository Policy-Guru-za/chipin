import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { DreamBoardCard } from '@/components/dream-board/DreamBoardCard';
import { ContributionForm } from '@/components/forms/ContributionForm';
import { Button } from '@/components/ui/button';
import { getDreamBoardBySlug } from '@/lib/db/queries';
import { buildDreamBoardMetadata } from '@/lib/dream-boards/metadata';
import { buildGuestViewModel } from '@/lib/dream-boards/view-model';
import { getAvailablePaymentProviders } from '@/lib/payments';

const getBoard = cache(async (slug: string) => getDreamBoardBySlug(slug));

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const board = await getBoard(params.slug);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!board) {
    return {
      title: 'Contribute | ChipIn',
      description: 'Chip in together for a dream gift.',
    };
  }

  return buildDreamBoardMetadata(board, { baseUrl, path: `/${board.slug}/contribute` });
}

export default async function ContributionPage({ params }: { params: { slug: string } }) {
  const board = await getBoard(params.slug);
  if (!board) {
    notFound();
  }

  const availableProviders = getAvailablePaymentProviders();

  const view = buildGuestViewModel(board);

  if (view.isClosed) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
        <DreamBoardCard
          imageUrl={view.displayImage}
          title={view.displayTitle}
          subtitle={view.displaySubtitle}
        />
        <div className="rounded-3xl border border-border bg-white p-6 text-center">
          <p className="text-sm text-text">
            This Dream Board is no longer accepting contributions.
          </p>
          <Link href={`/${board.slug}`}>
            <Button className="mt-4" variant="outline">
              Back to Dream Board
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Step 1 of 2
        </p>
        <h1 className="text-3xl font-display text-text">
          {view.showCharityOverflow
            ? `Support ${view.overflowTitle}`
            : `Contribute to ${board.childName}'s gift`}
        </h1>
      </div>

      <DreamBoardCard
        imageUrl={view.displayImage}
        title={view.displayTitle}
        subtitle={view.displaySubtitle}
        tag={view.showCharityOverflow ? 'Charity overflow' : undefined}
      />

      {view.showCharityOverflow && view.overflowData ? (
        <div className="rounded-3xl border border-accent/40 bg-accent/10 p-6 text-sm text-text">
          <p className="font-semibold">Gift fully funded!</p>
          <p className="mt-2 text-text-muted">
            Contributions now support {view.overflowData.causeName}:{' '}
            {view.overflowData.impactDescription}.
          </p>
        </div>
      ) : null}

      {availableProviders.length === 0 ? (
        <div className="rounded-3xl border border-border bg-subtle p-6 text-center text-sm text-text">
          Payments are temporarily unavailable. Please check back shortly.
        </div>
      ) : null}

      <ContributionForm
        dreamBoardId={board.id}
        childName={board.childName}
        giftTitle={view.displayTitle}
        headline={
          view.showCharityOverflow
            ? `Support ${view.overflowTitle}`
            : `Contribute to ${board.childName}'s gift`
        }
        subtitle={view.displaySubtitle}
        slug={board.slug}
        availableProviders={availableProviders}
      />
    </section>
  );
}
