import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { getDreamBoardById } from '@/lib/db/queries';

export default async function DreamBoardSuccessPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireSession();
  const board = await getDreamBoardById(params.id, session.hostId);

  if (!board) {
    redirect('/dashboard');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const shareUrl = `${baseUrl}/${board.slug}`;

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Your Dream Board is live!</CardTitle>
          <CardDescription>Share your link with guests to start collecting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border bg-subtle px-4 py-3 text-sm text-text">
            {shareUrl}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={shareUrl} target="_blank" rel="noreferrer">
              <Button>Open Dream Board</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
