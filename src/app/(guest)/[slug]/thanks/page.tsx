import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProgressBar } from '@/components/dream-board/ProgressBar';
import { Button } from '@/components/ui/button';
import { getContributionByPaymentRef, getDreamBoardBySlug } from '@/lib/db/queries';
import { buildThankYouViewModel } from '@/lib/dream-boards/view-model';
import type { PaymentProvider } from '@/lib/payments';

type ThanksPageProps = {
  params: { slug: string };
  searchParams?: { ref?: string; provider?: PaymentProvider };
};

export default async function ThankYouPage({ params, searchParams }: ThanksPageProps) {
  const board = await getDreamBoardBySlug(params.slug);
  if (!board) {
    notFound();
  }

  const ref = searchParams?.ref;
  const providerParam = searchParams?.provider;
  const provider: PaymentProvider =
    providerParam && ['payfast', 'ozow', 'snapscan'].includes(providerParam)
      ? providerParam
      : 'payfast';
  const contribution = ref ? await getContributionByPaymentRef(provider, ref) : null;
  const view = buildThankYouViewModel({ board, contribution });

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12 text-center">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Thank you
        </p>
        <h1 className="text-3xl font-display text-text">{view.headline}</h1>
        <p className="text-sm text-text-muted">{view.message}</p>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6">
        <ProgressBar value={view.percentage} />
        <div className="mt-4 flex items-center justify-between text-sm text-text">
          <span>{view.percentage}% funded</span>
          <span>
            {view.raisedLabel} of {view.goalLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={view.shareHref}>
          <Button>Share Dream Board</Button>
        </Link>
        <Link href={view.contributeHref}>
          <Button variant="outline">Contribute again</Button>
        </Link>
      </div>
    </section>
  );
}
