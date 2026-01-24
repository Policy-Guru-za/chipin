import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ContributorList } from '@/components/dream-board/ContributorList';
import { ProgressBar } from '@/components/dream-board/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { getDreamBoardDetailForHost, listContributionsForDreamBoard } from '@/lib/db/queries';
import { buildDashboardViewModel } from '@/lib/host/dashboard-view-model';

export default async function DreamBoardDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const board = await getDreamBoardDetailForHost(params.id, session.hostId);

  if (!board) {
    redirect('/dashboard');
  }

  const contributions = await listContributionsForDreamBoard(board.id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const view = buildDashboardViewModel(board, { baseUrl });

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{view.boardTitle}</CardTitle>
          <CardDescription>Share your link and track contributions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar value={view.percentage} />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text">
            <span>{view.raisedLabel} raised</span>
            <span>{view.contributionCount} contributions</span>
            <span className="uppercase tracking-[0.2em] text-text-muted">{view.statusLabel}</span>
          </div>
          <div className="rounded-xl border border-border bg-subtle px-4 py-3 text-sm text-text">
            {view.shareUrl}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={view.shareUrl ?? `/dashboard/${board.id}`} target="_blank" rel="noreferrer">
              <Button>Open Dream Board</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contributions</CardTitle>
          <CardDescription>Latest activity from your guests.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContributorList contributions={contributions} />
        </CardContent>
      </Card>
    </section>
  );
}
