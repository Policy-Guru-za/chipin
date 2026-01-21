import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DreamBoardCard } from '@/components/dream-board/DreamBoardCard';
import { ContributionForm } from '@/components/forms/ContributionForm';
import { Button } from '@/components/ui/button';
import { getDreamBoardBySlug } from '@/lib/db/queries';

type TakealotGiftData = {
  productName: string;
  productImage: string;
};

type PhilanthropyGiftData = {
  causeName: string;
  causeImage: string;
  impactDescription: string;
};

export default async function ContributionPage({ params }: { params: { slug: string } }) {
  const board = await getDreamBoardBySlug(params.slug);
  if (!board) {
    notFound();
  }

  const giftData = board.giftData as TakealotGiftData | PhilanthropyGiftData;
  const takealotGift = board.giftType === 'takealot_product' ? (giftData as TakealotGiftData) : null;
  const philanthropyGift = board.giftType === 'philanthropy' ? (giftData as PhilanthropyGiftData) : null;
  const giftTitle = takealotGift ? takealotGift.productName : philanthropyGift?.causeName ?? '';
  const giftSubtitle = takealotGift
    ? 'Dream gift'
    : philanthropyGift?.impactDescription ?? '';
  const giftImage = takealotGift ? takealotGift.productImage : philanthropyGift?.causeImage ?? '';

  if (board.status !== 'active' && board.status !== 'funded') {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
        <DreamBoardCard imageUrl={giftImage} title={giftTitle} subtitle={giftSubtitle} />
        <div className="rounded-3xl border border-border bg-white p-6 text-center">
          <p className="text-sm text-text">This Dream Board is no longer accepting contributions.</p>
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Step 1 of 2</p>
        <h1 className="text-3xl font-display text-text">Contribute to {board.childName}&apos;s gift</h1>
      </div>

      <DreamBoardCard imageUrl={giftImage} title={giftTitle} subtitle={giftSubtitle} />

      <ContributionForm dreamBoardId={board.id} childName={board.childName} giftTitle={giftTitle} />
    </section>
  );
}
