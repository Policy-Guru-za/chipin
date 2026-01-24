import Link from 'next/link';

import { ProgressBar } from '@/components/dream-board/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StateCard } from '@/components/ui/state-card';
import { requireSession } from '@/lib/auth/session';
import { listDreamBoardsForHost } from '@/lib/db/queries';
import { buildDashboardViewModel } from '@/lib/host/dashboard-view-model';
import { uiCopy } from '@/lib/ui/copy';

export default async function HostDashboardPage() {
  const session = await requireSession();
  const boards = await listDreamBoardsForHost(session.hostId);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-display text-text">Your Dream Boards</h1>
          <p className="text-text-muted">Track progress and share with your guests.</p>
        </div>
        <Link href="/create/child">
          <Button>Create a new board</Button>
        </Link>
      </div>

      {boards.length === 0 ? (
        <StateCard variant="empty" body={uiCopy.dashboard.empty.body} />
      ) : (
        <div className="grid gap-6">
          {boards.map((board) => {
            const view = buildDashboardViewModel(board);
            return (
              <Card key={board.id}>
                <CardHeader>
                  <CardTitle>{view.boardTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProgressBar value={view.percentage} />
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text">
                    <span>{view.raisedLabel} raised</span>
                    <span>{view.contributionCount} contributions</span>
                    <span className="uppercase tracking-[0.2em] text-text-muted">
                      {view.statusLabel}
                    </span>
                  </div>
                  <Link href={view.manageHref}>
                    <Button variant="outline">Manage</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
