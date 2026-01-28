import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requireAdminSession } from '@/lib/auth/session';
import { getExpiringDreamBoards } from '@/lib/db/views';
import { getPayoutQueueErrorMessage } from '@/lib/payouts/admin-copy';
import { formatZar } from '@/lib/utils/money';
import { listDreamBoardsReadyForPayouts, listPayoutsForAdmin } from '@/lib/payouts/queries';
import { createPayoutsForDreamBoard } from '@/lib/payouts/service';

const createPayoutSchema = z.object({
  dreamBoardId: z.string().uuid(),
});

const payoutStatusLabel = (status: string) =>
  ({
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  })[status] ?? status;

const payoutTypeLabel = (type: string) =>
  ({
    takealot_gift_card: 'Takealot Gift Card',
    karri_card_topup: 'Karri Card Top-up',
    philanthropy_donation: 'Philanthropy Donation',
  })[type] ?? type;

const dateFormatter = new Intl.DateTimeFormat('en-ZA', {
  timeZone: 'Africa/Johannesburg',
});
const formatDate = (value: Date) => dateFormatter.format(value);

async function createPayoutsAction(formData: FormData) {
  'use server';
  const session = await requireAdminSession();
  const parsed = createPayoutSchema.safeParse({
    dreamBoardId: formData.get('dreamBoardId'),
  });

  if (!parsed.success) {
    redirect('/admin/payouts?error=invalid-board');
  }

  try {
    const result = await createPayoutsForDreamBoard({
      dreamBoardId: parsed.data.dreamBoardId,
      actor: { type: 'admin', id: session.hostId, email: session.email },
    });

    if (result.skipped && result.calculation.raisedCents === 0) {
      redirect('/admin/payouts?error=no-contributions');
    }
  } catch (error) {
    redirect('/admin/payouts?error=payout-create-failed');
  }

  revalidatePath('/admin/payouts');
  redirect('/admin/payouts');
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const error = typeof searchParams?.error === 'string' ? searchParams.error : null;
  const errorMessage = getPayoutQueueErrorMessage(error);
  const readyBoards = await listDreamBoardsReadyForPayouts();
  const expiringBoards = await getExpiringDreamBoards();
  const payouts = await listPayoutsForAdmin({
    statuses: ['pending', 'processing', 'failed'],
    limit: 100,
  });

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-display">Payout queue</h1>
        <p className="text-sm text-text-muted">
          Generate payouts for closed boards, then mark each payout once you complete the manual
          workflow.
        </p>
        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ready to create payouts</h2>
          <span className="text-xs text-text-muted">{readyBoards.length} boards</span>
        </div>
        {readyBoards.length === 0 ? (
          <Card className="p-6 text-sm text-text-muted">
            No Dream Boards are ready for payout yet.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {readyBoards.map((board) => (
              <Card key={board.id} className="space-y-4 p-6">
                <div>
                  <div className="text-lg font-semibold">{board.childName}</div>
                  <div className="text-sm text-text-muted">{board.hostEmail}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    Raised: <span className="font-semibold">{formatZar(board.raisedCents)}</span>
                  </div>
                  <div>Contributions: {board.contributionCount}</div>
                  <div>Method: {payoutTypeLabel(board.payoutMethod)}</div>
                </div>
                <form action={createPayoutsAction}>
                  <input type="hidden" name="dreamBoardId" value={board.id} />
                  <Button type="submit" size="sm">
                    Generate payouts
                  </Button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Expiring in 7 days</h2>
          <span className="text-xs text-text-muted">{expiringBoards.length} boards</span>
        </div>
        {expiringBoards.length === 0 ? (
          <Card className="p-6 text-sm text-text-muted">No boards are expiring soon.</Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {expiringBoards.map((board) => (
              <Card key={board.id} className="space-y-2 p-5">
                <div className="text-lg font-semibold">{board.childName}</div>
                <div className="text-sm text-text-muted">/{board.slug}</div>
                <div className="text-sm text-text">Deadline: {formatDate(board.deadline)}</div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Pending &amp; failed payouts</h2>
          <Link
            href="/admin/payouts/export"
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-subtle"
          >
            Export CSV
          </Link>
        </div>
        {payouts.length === 0 ? (
          <Card className="p-6 text-sm text-text-muted">No payouts waiting for action.</Card>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
              <Card key={payout.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <div className="flex-1 space-y-1">
                  <div className="text-sm text-text-muted">{payoutTypeLabel(payout.type)}</div>
                  <div className="text-lg font-semibold">{payout.childName ?? 'Unknown child'}</div>
                  <div className="text-sm text-text-muted">
                    {payout.hostEmail ?? 'Unknown host'}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{formatZar(payout.netCents)}</div>
                  <div className="text-text-muted">{payoutStatusLabel(payout.status)}</div>
                </div>
                <Link
                  href={`/admin/payouts/${payout.id}`}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-subtle"
                >
                  Review
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
