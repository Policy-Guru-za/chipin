import Image from 'next/image';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { CreateFlowShell } from '@/components/layout/CreateFlowShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireSession } from '@/lib/auth/session';
import { getDreamBoardDraft, saveDreamBoardDraft } from '@/lib/dream-boards/draft';
import { isDateWithinRange } from '@/lib/dream-boards/validation';
import { buildCreateFlowViewModel } from '@/lib/host/create-view-model';
import { deleteChildPhoto, UploadChildPhotoError, uploadChildPhoto } from '@/lib/integrations/blob';
import { log } from '@/lib/observability/logger';
import * as Sentry from '@sentry/nextjs';

const childSchema = z.object({
  childName: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-zA-Z\s'-]+$/, 'Letters only'),
  birthdayDate: z.string().min(1),
});

async function saveChildDetailsAction(formData: FormData) {
  'use server';

  const session = await requireSession();
  const childName = formData.get('childName');
  const birthdayDate = formData.get('birthdayDate');
  const photo = formData.get('photo');

  const result = childSchema.safeParse({ childName, birthdayDate });
  if (!result.success) {
    redirect('/create/child?error=invalid');
  }

  if (!isDateWithinRange(result.data.birthdayDate)) {
    redirect('/create/child?error=date_range');
  }

  if (!(photo instanceof File) || photo.size === 0) {
    redirect('/create/child?error=photo');
  }

  try {
    const upload = await uploadChildPhoto(photo, session.hostId);
    const existingDraft = await getDreamBoardDraft(session.hostId);
    if (existingDraft?.childPhotoUrl) {
      await deleteChildPhoto(existingDraft.childPhotoUrl);
    }
    await saveDreamBoardDraft(session.hostId, {
      childName: result.data.childName,
      birthdayDate: result.data.birthdayDate,
      childPhotoUrl: upload.url,
      photoFilename: upload.filename,
    });
    redirect('/create/gift');
  } catch (error) {
    log('error', 'child_photo_upload_failed', {
      hostId: session.hostId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    Sentry.captureException(error, {
      tags: { area: 'upload', step: 'child' },
      extra: { hostId: session.hostId },
    });
    if (error instanceof UploadChildPhotoError) {
      redirect(`/create/child?error=${error.code}`);
    }

    redirect('/create/child?error=upload_failed');
  }
}

type ChildSearchParams = {
  error?: string;
};

export default async function CreateChildPage({
  searchParams,
}: {
  searchParams?: ChildSearchParams;
}) {
  const session = await requireSession();
  const draft = await getDreamBoardDraft(session.hostId);
  const error = searchParams?.error;
  const view = buildCreateFlowViewModel({ step: 'child', draft });

  return (
    <CreateFlowShell stepLabel={view.stepLabel} title={view.title} subtitle={view.subtitle}>
      <Card>
        <CardHeader>
          <CardTitle>Child details</CardTitle>
          <CardDescription>Tell us who we’re celebrating and add a photo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error === 'invalid' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please complete all required fields.
            </div>
          ) : null}
          {error === 'date_range' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Choose a birthday within the next 90 days.
            </div>
          ) : null}
          {error === 'photo' || error === 'empty_file' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please upload a photo of your child.
            </div>
          ) : null}
          {error === 'invalid_type' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Photos must be JPG, PNG, or WebP.
            </div>
          ) : null}
          {error === 'file_too_large' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Photo must be under 5MB.
            </div>
          ) : null}
          {error === 'upload_failed' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Upload failed. Please try again.
            </div>
          ) : null}

          {draft?.childPhotoUrl ? (
            <div className="flex items-center gap-4">
              <Image
                src={draft.childPhotoUrl}
                alt="Child photo preview"
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
              />
              <div className="text-sm text-text-muted">
                Photo already uploaded. Uploading a new photo will replace it.
              </div>
            </div>
          ) : null}

          <form action={saveChildDetailsAction} className="space-y-5" encType="multipart/form-data">
            <div className="space-y-2">
              <label htmlFor="childName" className="text-sm font-medium text-text">
                Child’s first name
              </label>
              <Input
                id="childName"
                name="childName"
                placeholder="e.g. Maya"
                required
                defaultValue={draft?.childName ?? ''}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="birthdayDate" className="text-sm font-medium text-text">
                Birthday date
              </label>
              <Input
                id="birthdayDate"
                name="birthdayDate"
                type="date"
                required
                defaultValue={draft?.birthdayDate ?? ''}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="photo" className="text-sm font-medium text-text">
                Child’s photo
              </label>
              <Input
                id="photo"
                name="photo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
              />
              <p className="text-xs text-text-muted">Max 5MB. JPG, PNG, or WebP.</p>
            </div>
            <Button type="submit">Continue to gift</Button>
          </form>
        </CardContent>
      </Card>
    </CreateFlowShell>
  );
}
