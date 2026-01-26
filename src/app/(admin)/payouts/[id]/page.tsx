import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requireAdminSession } from '@/lib/auth/session';
import { listAuditLogsForTarget } from '@/lib/audit';
import { formatZar, formatZarWithCents } from '@/lib/utils/money';
import { decryptSensitiveValue } from '@/lib/utils/encryption';
import { executeAutomatedPayout, isAutomationEnabledForType } from '@/lib/payouts/automation';
import { getPayoutDetail, listPayoutItemsForPayout } from '@/lib/payouts/queries';
import { addPayoutNote, completePayout, failPayout } from '@/lib/payouts/service';

import { DocumentsCard } from './documents-card';

const completeSchema = z.object({
  payoutId: z.string().uuid(),
  externalRef: z.string().min(2),
});

const failSchema = z.object({
  payoutId: z.string().uuid(),
  reason: z.string().min(4),
});

const noteSchema = z.object({
  payoutId: z.string().uuid(),
  note: z.string().min(3).max(500),
});

const automationSchema = z.object({
  payoutId: z.string().uuid(),
});

type PayoutDetail = NonNullable<Awaited<ReturnType<typeof getPayoutDetail>>>;
type PayoutItem = Awaited<ReturnType<typeof listPayoutItemsForPayout>>[number];
type AuditLog = Awaited<ReturnType<typeof listAuditLogsForTarget>>[number];

const payoutTypeLabel = (type: string) =>
  ({
    takealot_gift_card: 'Takealot Gift Card',
    karri_card_topup: 'Karri Card Top-up',
    philanthropy_donation: 'Philanthropy Donation',
  })[type] ?? type;

const payoutStatusLabel = (status: string) =>
  ({
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  })[status] ?? status;

const errorMessage = (code: string | null) => {
  if (!code) return null;
  return (
    {
      invalid: 'Check the form input and try again.',
      failed: 'Action failed. Review logs and retry.',
      'automation-disabled': 'Automation is disabled for this payout type.',
      receipt_invalid: 'Receipt upload failed. Check the file and try again.',
      receipt_failed: 'Receipt upload failed. Please try again.',
    }[code] ?? 'Something went wrong.'
  );
};

const SummaryCard = ({ payout }: { payout: PayoutDetail }) => (
  <Card className="space-y-3 p-6">
    <h2 className="text-lg font-semibold">Payout summary</h2>
    <div className="text-2xl font-semibold">{formatZar(payout.netCents)}</div>
    <div className="text-sm text-text-muted">
      Gross {formatZarWithCents(payout.grossCents)} · Fees {formatZarWithCents(payout.feeCents)}
    </div>
    {payout.errorMessage ? (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {payout.errorMessage}
      </div>
    ) : null}
    <div className="text-sm text-text-muted">Board: {payout.dreamBoardSlug}</div>
    <div className="text-sm text-text-muted">Host: {payout.hostEmail}</div>
    <div className="text-sm text-text-muted">Payout email: {payout.payoutEmail}</div>
    <div className="text-xs text-text-muted">
      Created {payout.createdAt.toISOString()}
      {payout.completedAt ? ` · Completed ${payout.completedAt.toISOString()}` : ''}
    </div>
  </Card>
);

const RecipientCard = ({ payout }: { payout: PayoutDetail }) => (
  <Card className="space-y-3 p-6">
    <h2 className="text-lg font-semibold">Recipient data</h2>
    {payout.type === 'karri_card_topup' ? (
      <div className="rounded-xl border border-border bg-subtle px-4 py-3 text-xs text-text">
        Karri card:{' '}
        {(() => {
          try {
            const recipient = payout.recipientData as { cardNumberEncrypted?: string } | null;
            if (!recipient?.cardNumberEncrypted) {
              return 'Unavailable';
            }
            return decryptSensitiveValue(recipient.cardNumberEncrypted);
          } catch {
            return 'Unavailable';
          }
        })()}
      </div>
    ) : null}
    <pre className="whitespace-pre-wrap rounded-xl bg-subtle px-4 py-3 text-xs text-text">
      {JSON.stringify(payout.recipientData, null, 2)}
    </pre>
    {payout.giftData ? (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-text">Gift details</h3>
        <pre className="whitespace-pre-wrap rounded-xl bg-subtle px-4 py-3 text-xs text-text">
          {JSON.stringify(payout.giftData, null, 2)}
        </pre>
      </div>
    ) : null}
    {payout.overflowGiftData ? (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-text">Overflow cause</h3>
        <pre className="whitespace-pre-wrap rounded-xl bg-subtle px-4 py-3 text-xs text-text">
          {JSON.stringify(payout.overflowGiftData, null, 2)}
        </pre>
      </div>
    ) : null}
  </Card>
);

const LineItemsCard = ({ items }: { items: PayoutItem[] }) => (
  <Card className="space-y-3 p-6">
    <h2 className="text-lg font-semibold">Line items</h2>
    {items.length === 0 ? (
      <p className="text-sm text-text-muted">No line items recorded.</p>
    ) : (
      <div className="space-y-2 text-sm">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <span className="capitalize">{item.type}</span>
            <span className="font-semibold">{formatZar(item.amountCents)}</span>
          </div>
        ))}
      </div>
    )}
  </Card>
);

const StatusActions = ({ payoutId, status }: { payoutId: string; status: string }) => (
  <Card className="space-y-4 p-6">
    <h2 className="text-lg font-semibold">Update status</h2>
    <form action={completeAction} className="space-y-3">
      <input type="hidden" name="payoutId" value={payoutId} />
      <div>
        <label className="text-sm font-semibold">External reference</label>
        <Input name="externalRef" placeholder="Gift card code / receipt ID" />
      </div>
      <Button type="submit" size="sm" disabled={status === 'completed'}>
        Mark as completed
      </Button>
    </form>

    <form action={failAction} className="space-y-3 border-t border-border pt-4">
      <input type="hidden" name="payoutId" value={payoutId} />
      <div>
        <label className="text-sm font-semibold">Failure reason</label>
        <Input name="reason" placeholder="Why did the payout fail?" />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={status === 'completed'}>
        Mark as failed
      </Button>
    </form>
  </Card>
);

const NotesCard = ({ payoutId, auditLogs }: { payoutId: string; auditLogs: AuditLog[] }) => (
  <Card className="space-y-4 p-6">
    <h2 className="text-lg font-semibold">Admin notes</h2>
    <form action={noteAction} className="space-y-3">
      <input type="hidden" name="payoutId" value={payoutId} />
      <div>
        <label className="text-sm font-semibold">Add a note</label>
        <Input name="note" placeholder="Manual step completed, receipt saved..." />
      </div>
      <Button type="submit" size="sm" variant="outline">
        Save note
      </Button>
    </form>
    <div className="space-y-3 text-sm">
      {auditLogs.length === 0 ? (
        <p className="text-text-muted">No audit events recorded yet.</p>
      ) : (
        auditLogs.map((log) => (
          <div key={log.id} className="rounded-xl border border-border px-3 py-2">
            <div className="text-xs text-text-muted">
              {log.createdAt.toISOString()} · {log.actorEmail ?? log.actorType}
            </div>
            <div className="font-semibold">{log.action}</div>
            {log.metadata ? (
              <pre className="mt-2 whitespace-pre-wrap text-xs text-text-muted">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ))
      )}
    </div>
  </Card>
);

const AutomationCard = ({ payout }: { payout: PayoutDetail }) => {
  const automationEnabled = isAutomationEnabledForType(payout.type);
  const disabled = payout.status === 'completed' || !automationEnabled;
  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">Automation</h2>
      <p className="text-sm text-text-muted">
        {automationEnabled
          ? 'Trigger automated payout execution with the configured provider.'
          : 'Automation is disabled for this payout type.'}
      </p>
      <form action={automationAction}>
        <input type="hidden" name="payoutId" value={payout.id} />
        <Button type="submit" size="sm" disabled={disabled}>
          Run automated payout
        </Button>
      </form>
    </Card>
  );
};

async function completeAction(formData: FormData) {
  'use server';
  const session = await requireAdminSession();
  const parsed = completeSchema.safeParse({
    payoutId: formData.get('payoutId'),
    externalRef: formData.get('externalRef'),
  });

  if (!parsed.success) {
    redirect(`/admin/payouts/${formData.get('payoutId')}?error=invalid`);
  }

  try {
    await completePayout({
      payoutId: parsed.data.payoutId,
      externalRef: parsed.data.externalRef,
      actor: { type: 'admin', id: session.hostId, email: session.email },
    });
  } catch (error) {
    redirect(`/admin/payouts/${parsed.data.payoutId}?error=failed`);
  }

  revalidatePath(`/admin/payouts/${parsed.data.payoutId}`);
  redirect(`/admin/payouts/${parsed.data.payoutId}`);
}

async function failAction(formData: FormData) {
  'use server';
  const session = await requireAdminSession();
  const parsed = failSchema.safeParse({
    payoutId: formData.get('payoutId'),
    reason: formData.get('reason'),
  });

  if (!parsed.success) {
    redirect(`/admin/payouts/${formData.get('payoutId')}?error=invalid`);
  }

  try {
    await failPayout({
      payoutId: parsed.data.payoutId,
      errorMessage: parsed.data.reason,
      actor: { type: 'admin', id: session.hostId, email: session.email },
    });
  } catch (error) {
    redirect(`/admin/payouts/${parsed.data.payoutId}?error=failed`);
  }

  revalidatePath(`/admin/payouts/${parsed.data.payoutId}`);
  redirect(`/admin/payouts/${parsed.data.payoutId}`);
}

async function noteAction(formData: FormData) {
  'use server';
  const session = await requireAdminSession();
  const parsed = noteSchema.safeParse({
    payoutId: formData.get('payoutId'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    redirect(`/admin/payouts/${formData.get('payoutId')}?error=invalid`);
  }

  try {
    await addPayoutNote({
      payoutId: parsed.data.payoutId,
      note: parsed.data.note,
      actor: { type: 'admin', id: session.hostId, email: session.email },
    });
  } catch (error) {
    redirect(`/admin/payouts/${parsed.data.payoutId}?error=failed`);
  }

  revalidatePath(`/admin/payouts/${parsed.data.payoutId}`);
  redirect(`/admin/payouts/${parsed.data.payoutId}`);
}

async function automationAction(formData: FormData) {
  'use server';
  const session = await requireAdminSession();
  const parsed = automationSchema.safeParse({
    payoutId: formData.get('payoutId'),
  });

  if (!parsed.success) {
    redirect(`/admin/payouts/${formData.get('payoutId')}?error=invalid`);
  }

  try {
    await executeAutomatedPayout({
      payoutId: parsed.data.payoutId,
      actor: { type: 'admin', id: session.hostId, email: session.email },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Automation disabled')) {
      redirect(`/admin/payouts/${parsed.data.payoutId}?error=automation-disabled`);
    }
    redirect(`/admin/payouts/${parsed.data.payoutId}?error=failed`);
  }

  revalidatePath(`/admin/payouts/${parsed.data.payoutId}`);
  redirect(`/admin/payouts/${parsed.data.payoutId}`);
}

export default async function PayoutDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const payout = await getPayoutDetail(params.id);
  if (!payout) {
    notFound();
  }

  const items = await listPayoutItemsForPayout(payout.id);
  const auditLogs = await listAuditLogsForTarget({ targetType: 'payout', targetId: payout.id });
  const errorCode = typeof searchParams?.error === 'string' ? searchParams.error : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/payouts" className="text-sm text-text-muted hover:text-text">
            ← Back to payouts
          </Link>
          <h1 className="mt-2 text-3xl font-display">{payoutTypeLabel(payout.type)}</h1>
          <p className="text-sm text-text-muted">{payout.childName}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          {payoutStatusLabel(payout.status)}
        </span>
      </div>

      {errorMessage(errorCode) ? (
        <Card className="border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {errorMessage(errorCode)}
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <SummaryCard payout={payout} />
        <RecipientCard payout={payout} />
        <LineItemsCard items={items} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusActions payoutId={payout.id} status={payout.status} />
        <AutomationCard payout={payout} />
        <DocumentsCard payout={payout} />
        <NotesCard payoutId={payout.id} auditLogs={auditLogs} />
      </div>
    </div>
  );
}
