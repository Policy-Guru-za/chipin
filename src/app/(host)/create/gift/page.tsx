import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { CURATED_CAUSES, getCauseById } from '@/lib/dream-boards/causes';
import { getDreamBoardDraft, updateDreamBoardDraft } from '@/lib/dream-boards/draft';
import { fetchTakealotProduct, isTakealotUrl } from '@/lib/integrations/takealot';
import { TakealotGiftForm } from '@/components/forms/TakealotGiftForm';

const takealotSchema = z.object({
  productUrl: z.string().url().refine((value) => isTakealotUrl(value), 'Invalid Takealot URL'),
  overflowSelection: z.string().min(1),
});

const causeSelectionSchema = z.object({
  causeSelection: z.string().min(1),
});

const parseCauseSelection = (value: string) => {
  const [causeId, impactIndexString] = value.split('::');
  const impactIndex = Number(impactIndexString);
  const cause = getCauseById(causeId);
  if (!cause || !Number.isInteger(impactIndex)) {
    return null;
  }
  const impact = cause.impacts[impactIndex];
  if (!impact) {
    return null;
  }
  return { cause, impact, impactIndex };
};

async function saveTakealotGiftAction(formData: FormData) {
  'use server';

  const session = await requireSession();
  const draft = await getDreamBoardDraft(session.hostId);
  if (!draft?.childName || !draft?.birthdayDate || !draft?.childPhotoUrl) {
    redirect('/create/child');
  }
  const productUrl = formData.get('productUrl');
  const overflowSelection = formData.get('overflowSelection');
  const result = takealotSchema.safeParse({ productUrl, overflowSelection });

  if (!result.success) {
    redirect('/create/gift?error=invalid&type=takealot');
  }

  const overflow = parseCauseSelection(result.data.overflowSelection);
  if (!overflow) {
    redirect('/create/gift?error=overflow&type=takealot');
  }

  try {
    const product = await fetchTakealotProduct(result.data.productUrl);
    await updateDreamBoardDraft(session.hostId, {
      giftType: 'takealot_product',
      giftData: {
        type: 'takealot_product',
        productUrl: product.url,
        productName: product.name,
        productImage: product.imageUrl,
        productPrice: product.priceCents,
      },
      goalCents: product.priceCents,
      overflowGiftData: {
        causeId: overflow.cause.id,
        causeName: overflow.cause.name,
        impactDescription: overflow.impact.description,
      },
    });
    redirect('/create/details');
  } catch {
    redirect('/create/gift?error=fetch_failed&type=takealot');
  }
}

async function savePhilanthropyGiftAction(formData: FormData) {
  'use server';

  const session = await requireSession();
  const draft = await getDreamBoardDraft(session.hostId);
  if (!draft?.childName || !draft?.birthdayDate || !draft?.childPhotoUrl) {
    redirect('/create/child');
  }
  const causeSelection = formData.get('causeSelection');
  const result = causeSelectionSchema.safeParse({ causeSelection });

  if (!result.success) {
    redirect('/create/gift?error=invalid&type=philanthropy');
  }

  const selection = parseCauseSelection(result.data.causeSelection);
  if (!selection) {
    redirect('/create/gift?error=invalid&type=philanthropy');
  }

  await updateDreamBoardDraft(session.hostId, {
    giftType: 'philanthropy',
    giftData: {
      type: 'philanthropy',
      causeId: selection.cause.id,
      causeName: selection.cause.name,
      causeDescription: selection.cause.description,
      causeImage: selection.cause.imageUrl,
      impactDescription: selection.impact.description,
      amountCents: selection.impact.amountCents,
    },
    goalCents: selection.impact.amountCents,
    overflowGiftData: undefined,
  });
  redirect('/create/details');
}

type GiftSearchParams = {
  type?: string;
  error?: string;
};

export default async function CreateGiftPage({
  searchParams,
}: {
  searchParams?: GiftSearchParams;
}) {
  const session = await requireSession();
  const draft = await getDreamBoardDraft(session.hostId);
  if (!draft?.childName || !draft?.birthdayDate || !draft?.childPhotoUrl) {
    redirect('/create/child');
  }

  const giftType = searchParams?.type === 'philanthropy' ? 'philanthropy' : 'takealot';
  const error = searchParams?.error;

  const selectedOverflow = (() => {
    if (!draft?.overflowGiftData) return undefined;
    const cause = getCauseById(draft.overflowGiftData.causeId);
    if (!cause) return undefined;
    const impactIndex = cause.impacts.findIndex(
      (impact) => impact.description === draft.overflowGiftData?.impactDescription
    );
    if (impactIndex < 0) return undefined;
    return `${cause.id}::${impactIndex}`;
  })();

  const selectedCause = (() => {
    if (draft?.giftData?.type !== 'philanthropy') return undefined;
    const philanthropyGift = draft.giftData;
    const cause = getCauseById(philanthropyGift.causeId);
    if (!cause) return undefined;
    const impactIndex = cause.impacts.findIndex(
      (impact) => impact.description === philanthropyGift.impactDescription
    );
    if (impactIndex < 0) return undefined;
    return `${cause.id}::${impactIndex}`;
  })();

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Step 2 of 4
        </p>
        <h1 className="text-3xl font-display text-text">What’s {draft.childName}&apos;s dream gift?</h1>
        <p className="text-text-muted">Choose one special item to fund.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/create/gift?type=takealot"
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            giftType === 'takealot' ? 'border-primary bg-primary text-white' : 'border-border text-text'
          }`}
        >
          Takealot product
        </Link>
        <Link
          href="/create/gift?type=philanthropy"
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            giftType === 'philanthropy' ? 'border-primary bg-primary text-white' : 'border-border text-text'
          }`}
        >
          Gift of giving
        </Link>
      </div>

      {giftType === 'takealot' ? (
        <Card>
          <CardHeader>
            <CardTitle>Takealot product</CardTitle>
            <CardDescription>Search or paste a Takealot link and select a charity overflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TakealotGiftForm
              action={saveTakealotGiftAction}
              causes={CURATED_CAUSES}
              defaultProductUrl={
                draft?.giftData?.type === 'takealot_product' ? draft.giftData.productUrl : ''
              }
              selectedOverflow={selectedOverflow}
              error={error}
            />

            {draft?.giftData?.type === 'takealot_product' ? (
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-subtle p-4">
                <Image
                  src={draft.giftData.productImage}
                  alt={draft.giftData.productName}
                  width={72}
                  height={72}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text">{draft.giftData.productName}</p>
                  <p className="text-sm text-text-muted">R{(draft.giftData.productPrice / 100).toFixed(2)}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Gift of giving</CardTitle>
            <CardDescription>Select a cause and impact level.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Please choose a cause to continue.
              </div>
            ) : null}
            <form action={savePhilanthropyGiftAction} className="space-y-6">
              <div className="grid gap-3">
                {CURATED_CAUSES.map((cause) =>
                  cause.impacts.map((impact, index) => {
                    const value = `${cause.id}::${index}`;
                    return (
                      <label key={value} className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4">
                        <input
                          type="radio"
                          name="causeSelection"
                          value={value}
                          defaultChecked={selectedCause === value}
                          className="mt-1"
                          required
                        />
                        <div>
                          <p className="text-sm font-semibold text-text">{cause.name}</p>
                          <p className="text-xs text-text-muted">{impact.description}</p>
                          <p className="text-xs text-text-muted">Goal: R{(impact.amountCents / 100).toFixed(0)}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              <Button type="submit">Continue to payout details</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
