import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProgressBar } from '@/components/dream-board/ProgressBar';
import { Button } from '@/components/ui/button';
import { getContributionByPaymentRef, getDreamBoardBySlug } from '@/lib/db/queries';
import { formatZar } from '@/lib/utils/money';

type ThanksPageProps = {
  params: { slug: string };
  searchParams?: { ref?: string };
};

export default async function ThankYouPage({ params, searchParams }: ThanksPageProps) {
  const board = await getDreamBoardBySlug(params.slug);
  if (!board) {
    notFound();
  }

  const ref = searchParams?.ref;
  const contribution = ref ? await getContributionByPaymentRef('payfast', ref) : null;
  const percentage = Math.min(100, Math.round((board.raisedCents / board.goalCents) * 100));

  const name = contribution?.contributorName || 'Friend';
  const amount = contribution?.amountCents ? formatZar(contribution.amountCents) : null;
  const isComplete = contribution?.paymentStatus === 'completed';

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12 text-center">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Thank you
        </p>
        <h1 className="text-3xl font-display text-text">
          {isComplete ? `Thank you, ${name}!` : 'Thanks for your support!'}
        </h1>
        <p className="text-sm text-text-muted">
          {amount && isComplete
            ? `Your ${amount} contribution is helping ${board.childName} get their dream gift.`
            : `We’ll update this page once your payment is confirmed.`}
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6">
        <ProgressBar value={percentage} />
        <div className="mt-4 flex items-center justify-between text-sm text-text">
          <span>{percentage}% funded</span>
          <span>
            {formatZar(board.raisedCents)} of {formatZar(board.goalCents)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/${board.slug}`}>
          <Button>Share Dream Board</Button>
        </Link>
        <Link href={`/${board.slug}/contribute`}>
          <Button variant="outline">Contribute again</Button>
        </Link>
      </div>
    </section>
  );
}
