import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string;
  height?: string;
  ariaLabel?: string;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  ariaLabel = 'Loading...',
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-stone-200';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
      role="status"
      aria-label={ariaLabel}
      aria-busy="true"
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

// Preset Skeleton Compositions

interface SkeletonCardProps {
  ariaLabel?: string;
}

export function DreamBoardCardSkeleton({ ariaLabel = 'Loading dream board' }: SkeletonCardProps) {
  return (
    <div
      className="rounded-2xl border border-border bg-surface p-4 space-y-4"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <div className="flex gap-4">
        <Skeleton variant="circular" className="h-16 w-16 shrink-0" ariaLabel="Loading avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" ariaLabel="Loading title" />
          <Skeleton className="h-4 w-1/2" ariaLabel="Loading subtitle" />
        </div>
      </div>
      <Skeleton variant="rounded" className="h-2 w-full" ariaLabel="Loading progress" />
    </div>
  );
}

export function ContributionFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading contribution form">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            className="h-14"
            ariaLabel={`Loading amount option ${i}`}
          />
        ))}
      </div>
      <Skeleton variant="rounded" className="h-14" ariaLabel="Loading custom amount input" />
      <Skeleton variant="rounded" className="h-12" ariaLabel="Loading payment method selector" />
      <Skeleton variant="rounded" className="h-12" ariaLabel="Loading submit button" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      <Skeleton variant="rectangular" className="h-48 w-full" ariaLabel="Loading image" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" ariaLabel="Loading product name" />
        <Skeleton className="h-4 w-1/2" ariaLabel="Loading price" />
      </div>
    </div>
  );
}
