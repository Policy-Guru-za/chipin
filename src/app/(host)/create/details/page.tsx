import { redirect } from 'next/navigation';
import { z } from 'zod';

import { CreateFlowShell } from '@/components/layout/CreateFlowShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireSession } from '@/lib/auth/session';
import { getDreamBoardDraft, updateDreamBoardDraft } from '@/lib/dream-boards/draft';
import { isDeadlineWithinRange } from '@/lib/dream-boards/validation';
import { buildCreateFlowViewModel } from '@/lib/host/create-view-model';
import { encryptSensitiveValue } from '@/lib/utils/encryption';

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
  const karriCardNumber = formData.get('karriCardNumber');

  const result = detailsSchema.safeParse({ payoutEmail, message, deadline });
  if (!result.success) {
    redirect('/create/details?error=invalid');
  }

  if (!isDeadlineWithinRange(result.data.deadline)) {
    redirect('/create/details?error=deadline');
  }

  let payoutMethod: 'takealot_gift_card' | 'karri_card_topup' | 'philanthropy_donation';
  let karriCardNumberEncrypted: string | undefined = draft.karriCardNumberEncrypted;

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

  if (payoutMethod === 'karri_card_topup') {
    if (!process.env.CARD_DATA_ENCRYPTION_KEY) {
      redirect('/create/details?error=secure');
    }
    const rawCard = typeof karriCardNumber === 'string' ? karriCardNumber : '';
    const sanitizedCard = rawCard.replace(/\s+/g, '').replace(/-/g, '');
    if (sanitizedCard) {
      karriCardNumberEncrypted = encryptSensitiveValue(sanitizedCard);
    }
    if (!karriCardNumberEncrypted) {
      redirect('/create/details?error=karri');
    }
  } else {
    karriCardNumberEncrypted = undefined;
  }

  await updateDreamBoardDraft(session.hostId, {
    payoutEmail: result.data.payoutEmail,
    payoutMethod,
    karriCardNumberEncrypted,
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
  const view = buildCreateFlowViewModel({ step: 'details', draft });
  if (view.redirectTo) {
    redirect(view.redirectTo);
  }
  if (!draft) {
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
    <CreateFlowShell stepLabel={view.stepLabel} title={view.title} subtitle={view.subtitle}>
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
          {error === 'karri' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Enter a valid Karri Card number to continue.
            </div>
          ) : null}
          {error === 'secure' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Karri Card setup is unavailable right now. Please try again later.
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

            {draft.giftType !== 'philanthropy' ? (
              <div className="space-y-2">
                <label htmlFor="karriCardNumber" className="text-sm font-medium text-text">
                  Karri Card number
                </label>
                <Input
                  id="karriCardNumber"
                  name="karriCardNumber"
                  placeholder="Only required for Karri top-ups"
                  autoComplete="off"
                />
                <p className="text-xs text-text-muted">
                  {draft.karriCardNumberEncrypted
                    ? 'Card number saved. Re-enter to update.'
                    : 'We only use this to load Karri top-ups.'}
                </p>
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
    </CreateFlowShell>
  );
}
