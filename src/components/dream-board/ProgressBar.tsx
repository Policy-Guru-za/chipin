'use client';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CheckIcon } from '@/components/icons';

type ProgressBarProps = {
  /** Current value (e.g., amount raised in cents) */
  value: number;
  /** Maximum value (e.g., goal in cents). Default: 100 */
  max?: number;
  /** Visual size of the bar */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage milestone markers */
  showMilestones?: boolean;
  /** Celebration mode for completed progress */
  variant?: 'default' | 'celebration';
  /** Additional CSS classes */
  className?: string;
};

const MILESTONES = [25, 50, 75];

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  showMilestones = true,
  variant = 'default',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const isComplete = percentage >= 100;
  const shouldCelebrate = variant === 'celebration' && isComplete;
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div
      className={cn('relative w-full', className)}
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Funding progress"
    >
      {/* Track */}
      <div className={cn('w-full overflow-hidden rounded-full bg-stone-200', sizeClasses[size])}>
        {/* Fill with spring animation */}
        <div
          className={cn(
            'relative h-full rounded-full transition-all',
            'duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            shouldCelebrate && !prefersReducedMotion && 'animate-pulse',
            'bg-gradient-to-r from-primary to-accent'
          )}
          style={{ width: `${percentage}%` }}
        >
          {/* Shimmer effect - only if motion allowed and not complete */}
          {!prefersReducedMotion && !isComplete && (
            <div
              className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Milestone markers */}
      {showMilestones && (
        <div className="relative mt-1 h-4">
          {MILESTONES.map((milestone) => {
            const isReached = percentage >= milestone;
            return (
              <div
                key={milestone}
                className={cn(
                  'absolute top-0 -translate-x-1/2 text-xs font-medium transition-colors',
                  isReached ? 'text-primary' : 'text-text-muted'
                )}
                style={{ left: `${milestone}%` }}
              >
                <div
                  className={cn(
                    'mx-auto mb-0.5 h-1.5 w-0.5 rounded-full transition-colors',
                    isReached ? 'bg-primary' : 'bg-stone-300'
                  )}
                  aria-hidden="true"
                />
                {milestone}%
              </div>
            );
          })}
        </div>
      )}

      {/* Completion indicator */}
      {isComplete && (
        <div
          className={cn(
            'absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-lifted',
            !prefersReducedMotion && 'animate-bounce-subtle'
          )}
          aria-hidden="true"
        >
          <CheckIcon size="sm" />
        </div>
      )}
    </div>
  );
}
