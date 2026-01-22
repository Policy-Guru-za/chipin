import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireSession } from '@/lib/auth/session';
import { getDreamBoardDraft, updateDreamBoardDraft } from '@/lib/dream-boards/draft';
import { isDeadlineWithinRange } from '@/lib/dream-boards/validation';

const detailsSchema = z.object({
  payoutEmail: z.string().email(),
  message: z.string().max(280).optional(),
  deadline: z.string().min(1),
});

const payoutMethodSchema = z.enum(['takealot_gift_card', 'karri_card_topup']);

async function saveDetailsAction(formData: FormData) {
  'use server';

  const session = await requireSession();
  const draft = await getDreamBoardDraft(session.hostId);
  if (!draft?.giftType) {
    redirect('/create/gift');
  }

  const payoutEmail = formData.get('payoutEmail');
  const message = formData.get('message');
  const deadline = formData.get('deadline');

  const result = detailsSchema.safeParse({ payoutEmail, message, deadline });
  if (!result.success) {
    redirect('/create/details?error=invalid');
  }

  if (!isDeadlineWithinRange(result.data.deadline)) {
    redirect('/create/details?error=deadline');
  }

  let payoutMethod: 'takealot_gift_card' | 'karri_card_topup' | 'philanthropy_donation';

  if (draft.giftType === 'philanthropy') {
    payoutMethod = 'philanthropy_donation';
  } else {
    const methodValue = formData.get('payoutMethod');
    const parsed = payoutMethodSchema.safeParse(methodValue);
    if (!parsed.success) {
      redirect('/create/details?error=payout');
    }
    payoutMethod = parsed.data;
  }

  await updateDreamBoardDraft(session.hostId, {
    payoutEmail: result.data.payoutEmail,
    payoutMethod,
    message: result.data.message?.trim() || undefined,
    deadline: result.data.deadline,
  });

  redirect('/create/review');
}

type DetailsSearchParams = {
  error?: string;
};

export default async function CreateDetailsPage({
  searchParams,
}: {
  searchParams?: DetailsSearchParams;
}) {
  const session = await requireSession();
  const draft = await getDreamBoardDraft(session.hostId);
  if (!draft?.giftType) {
    redirect('/create/gift');
  }

  const error = searchParams?.error;
  const defaultDeadline = (() => {
    if (draft.deadline) return draft.deadline;
    if (draft.birthdayDate && isDeadlineWithinRange(draft.birthdayDate)) {
      return draft.birthdayDate;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  })();

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Step 3 of 4
        </p>
        <h1 className="text-3xl font-display text-text">Almost done!</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout & final details</CardTitle>
          <CardDescription>
            We’ll send the payout to this email when the pot closes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error === 'invalid' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please complete all required fields.
            </div>
          ) : null}
          {error === 'deadline' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Deadline must be within the next 90 days.
            </div>
          ) : null}
          {error === 'payout' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please select a payout method.
            </div>
          ) : null}

          <form action={saveDetailsAction} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="payoutEmail" className="text-sm font-medium text-text">
                Payout email
              </label>
              <Input
                id="payoutEmail"
                name="payoutEmail"
                type="email"
                placeholder="you@example.com"
                required
                defaultValue={draft.payoutEmail ?? ''}
              />
              <p className="text-xs text-text-muted">
                {draft.giftType === 'philanthropy'
                  ? 'We’ll email the donation confirmation.'
                  : 'We’ll email the gift card or Karri confirmation.'}
              </p>
            </div>

            {draft.giftType !== 'philanthropy' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text">Payout method</label>
                <div className="grid gap-3">
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                    <input
                      type="radio"
                      name="payoutMethod"
                      value="takealot_gift_card"
                      defaultChecked={draft.payoutMethod === 'takealot_gift_card'}
                      required
                    />
                    <span className="text-sm text-text">Takealot gift card</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                    <input
                      type="radio"
                      name="payoutMethod"
                      value="karri_card_topup"
                      defaultChecked={draft.payoutMethod === 'karri_card_topup'}
                      required
                    />
                    <span className="text-sm text-text">Karri Card top-up</span>
                  </label>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium text-text">
                Personal message (optional)
              </label>
              <Input
                id="message"
                name="message"
                placeholder="E.g., Maya would love your contribution toward her dream bike!"
                defaultValue={draft.message ?? ''}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="deadline" className="text-sm font-medium text-text">
                Contribution deadline
              </label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                required
                defaultValue={defaultDeadline}
              />
            </div>

            <Button type="submit">Review & create</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
