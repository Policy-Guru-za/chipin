import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getCachedDreamBoardBySlug } from '@/lib/dream-boards/cache';

type PaymentFailedPageProps = {
  params: { slug: string };
};

export default async function PaymentFailedPage({ params }: PaymentFailedPageProps) {
  const board = await getCachedDreamBoardBySlug(params.slug);
  if (!board) {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12 text-center">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Payment failed
        </p>
        <h1 className="text-3xl font-display text-text">Payment unsuccessful</h1>
        <p className="text-sm text-text-muted">
          Your payment could not be processed. No funds were taken.
        </p>
      </div>

      <div className="flex justify-center">
        <Link href={`/${board.slug}/contribute`}>
          <Button>Try again</Button>
        </Link>
      </div>

      <p className="text-xs text-text-muted">Having trouble? Contact us.</p>
    </section>
  );
}
