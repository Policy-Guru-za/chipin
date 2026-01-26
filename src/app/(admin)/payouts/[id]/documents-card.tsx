import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireAdminSession } from '@/lib/auth/session';
import { uploadPayoutReceipt, UploadReceiptError } from '@/lib/integrations/blob';
import { getPayoutDetail } from '@/lib/payouts/queries';
import { addPayoutReceipt } from '@/lib/payouts/service';

const receiptSchema = z.object({
  payoutId: z.string().uuid(),
  documentType: z.enum(['receipt', 'certificate']),
});

type PayoutDetail = NonNullable<Awaited<ReturnType<typeof getPayoutDetail>>>;

export const DocumentsCard = ({ payout }: { payout: PayoutDetail }) => {
  if (payout.type !== 'philanthropy_donation') {
    return null;
  }

  const docs = (payout.recipientData ?? {}) as {
    receiptUrl?: string;
    certificateUrl?: string;
  };

  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">Donation documents</h2>
      <div className="space-y-2 text-sm text-text">
        {docs.receiptUrl ? (
          <a
            className="text-primary underline"
            href={`/api/internal/payouts/${payout.id}/documents/receipt`}
            target="_blank"
            rel="noreferrer"
          >
            View receipt
          </a>
        ) : (
          <p className="text-text-muted">Receipt not uploaded.</p>
        )}
        {docs.certificateUrl ? (
          <a
            className="text-primary underline"
            href={`/api/internal/payouts/${payout.id}/documents/certificate`}
            target="_blank"
            rel="noreferrer"
          >
            View certificate
          </a>
        ) : (
          <p className="text-text-muted">Certificate not uploaded.</p>
        )}
      </div>
      <form action={receiptUploadAction} className="space-y-3" encType="multipart/form-data">
        <input type="hidden" name="payoutId" value={payout.id} />
        <div className="space-y-2">
          <label className="text-sm font-semibold">Document type</label>
          <select
            name="documentType"
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-text"
          >
            <option value="receipt">Receipt</option>
            <option value="certificate">Certificate</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Upload document</label>
          <Input
            name="document"
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            required
          />
          <p className="text-xs text-text-muted">PDF, JPG, or PNG up to 10MB.</p>
        </div>
        <Button type="submit" size="sm" variant="outline">
          Upload document
        </Button>
      </form>
    </Card>
  );
};

async function receiptUploadAction(formData: FormData) {
  'use server';
  const session = await requireAdminSession();
  const parsed = receiptSchema.safeParse({
    payoutId: formData.get('payoutId'),
    documentType: formData.get('documentType'),
  });

  if (!parsed.success) {
    redirect(`/admin/payouts/${formData.get('payoutId')}?error=receipt_invalid`);
  }

  const document = formData.get('document');
  if (!(document instanceof File) || document.size === 0) {
    redirect(`/admin/payouts/${parsed.data.payoutId}?error=receipt_invalid`);
  }

  const payout = await getPayoutDetail(parsed.data.payoutId);
  if (!payout || payout.type !== 'philanthropy_donation') {
    redirect(`/admin/payouts/${parsed.data.payoutId}?error=receipt_invalid`);
  }

  try {
    const upload = await uploadPayoutReceipt(
      document,
      parsed.data.payoutId,
      parsed.data.documentType
    );
    await addPayoutReceipt({
      payoutId: parsed.data.payoutId,
      type: parsed.data.documentType,
      url: upload.url,
      contentType: upload.contentType,
      filename: upload.downloadName,
      encrypted: upload.encrypted,
      actor: { type: 'admin', id: session.hostId, email: session.email },
    });
  } catch (error) {
    if (error instanceof UploadReceiptError) {
      redirect(`/admin/payouts/${parsed.data.payoutId}?error=receipt_invalid`);
    }
    redirect(`/admin/payouts/${parsed.data.payoutId}?error=receipt_failed`);
  }

  revalidatePath(`/admin/payouts/${parsed.data.payoutId}`);
  redirect(`/admin/payouts/${parsed.data.payoutId}`);
}
