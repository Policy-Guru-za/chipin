type ContributorChipsProps = {
  contributors: Array<{ name: string }>;
};

export function ContributorChips({ contributors }: ContributorChipsProps) {
  if (!contributors.length) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs text-text-muted">
      {contributors.map((contributor, index) => (
        <span
          key={`${contributor.name}-${index}`}
          className="rounded-full border border-border bg-white px-3 py-1"
        >
          {contributor.name}
        </span>
      ))}
    </div>
  );
}
