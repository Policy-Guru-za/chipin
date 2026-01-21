type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
