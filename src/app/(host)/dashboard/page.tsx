import Link from 'next/link';

import { ProgressBar } from '@/components/dream-board/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listDreamBoardsForHost } from '@/lib/db/queries';
import { formatZar } from '@/lib/utils/money';

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
        <Card>
          <CardContent className="py-6 text-sm text-text-muted">
            You don’t have any Dream Boards yet. Create your first one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {boards.map((board) => {
            const percentage = Math.min(100, Math.round((board.raisedCents / board.goalCents) * 100));
            return (
              <Card key={board.id}>
                <CardHeader>
                  <CardTitle>{board.childName}&apos;s Dream Board</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProgressBar value={percentage} />
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text">
                    <span>{formatZar(board.raisedCents)} raised</span>
                    <span>{board.contributionCount} contributions</span>
                    <span className="uppercase tracking-[0.2em] text-text-muted">{board.status}</span>
                  </div>
                  <Link href={`/dashboard/${board.id}`}>
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
