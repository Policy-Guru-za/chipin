import { formatZarWithCents } from '@/lib/utils/money';

type Contribution = {
  id: string;
  contributorName: string | null;
  message: string | null;
  amountCents: number;
  paymentStatus: string;
  createdAt: Date;
};

type ContributorListProps = {
  contributions: Contribution[];
};

export function ContributorList({ contributions }: ContributorListProps) {
  if (!contributions.length) {
    return <p className="text-sm text-text-muted">No contributions yet.</p>;
  }

  return (
    <div className="space-y-3">
      {contributions.map((contribution) => (
        <div
          key={contribution.id}
          className="rounded-2xl border border-border bg-white p-4"
        >
          <div className="flex items-center justify-between text-sm font-semibold text-text">
            <span>{contribution.contributorName || 'Anonymous'}</span>
            <span>{formatZarWithCents(contribution.amountCents)}</span>
          </div>
          {contribution.message ? (
            <p className="mt-2 text-sm text-text-muted">“{contribution.message}”</p>
          ) : null}
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-text-muted">
            {contribution.paymentStatus}
          </p>
        </div>
      ))}
    </div>
  );
}
