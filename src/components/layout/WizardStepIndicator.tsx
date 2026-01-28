import { cn } from '@/lib/utils';
import { CheckIcon } from '@/components/icons';

interface WizardStep {
  label: string;
  href?: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface WizardStepIndicatorProps {
  steps: WizardStep[];
  currentStepIndex: number;
}

export function WizardStepIndicator({ steps, currentStepIndex }: WizardStepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isLast = index === steps.length - 1;

          return (
            <li key={step.label} className="relative flex-1">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-1/2 top-5 h-0.5 w-full -translate-y-1/2',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}

              <div className="relative flex flex-col items-center">
                {/* Step circle */}
                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCompleted
                      ? 'border-primary bg-primary text-white'
                      : isCurrent
                        ? 'border-primary bg-white text-primary ring-4 ring-primary/10'
                        : 'border-border bg-white text-text-muted'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <CheckIcon size="md" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium transition-colors',
                    isCurrent ? 'text-text' : 'text-text-muted'
                  )}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Compact variant for mobile screens.
 */
export function WizardStepIndicatorCompact({ steps, currentStepIndex }: WizardStepIndicatorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-text">
          Step {currentStepIndex + 1} of {steps.length}
        </span>
        <span className="text-text-muted">{steps[currentStepIndex]?.label}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
