'use client';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { PayFastIcon, OzowIcon, SnapScanIcon, CheckIcon } from '@/components/icons';

type PaymentProvider = 'payfast' | 'ozow' | 'snapscan';

interface PaymentMethod {
  id: PaymentProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'payfast',
    name: 'PayFast',
    description: 'Card, EFT, or mobile',
    icon: <PayFastIcon className="text-primary" />,
  },
  {
    id: 'ozow',
    name: 'Ozow',
    description: 'Instant EFT',
    icon: <OzowIcon className="text-primary" />,
  },
  {
    id: 'snapscan',
    name: 'SnapScan',
    description: 'Scan to pay',
    icon: <SnapScanIcon className="text-primary" />,
  },
];

interface PaymentMethodSelectorProps {
  value?: PaymentProvider | null;
  onChange?: (method: PaymentProvider) => void;
  availableMethods?: PaymentProvider[];
  className?: string;
}

export function PaymentMethodSelector({
  value,
  onChange,
  availableMethods = ['payfast', 'ozow', 'snapscan'],
  className,
}: PaymentMethodSelectorProps) {
  const prefersReducedMotion = useReducedMotion();

  const filteredMethods = PAYMENT_METHODS.filter((m) => availableMethods.includes(m.id));

  return (
    <div className={cn('space-y-3', className)} role="radiogroup" aria-label="Payment method">
      {filteredMethods.map((method) => {
        const isSelected = value === method.id;

        return (
          <button
            key={method.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange?.(method.id)}
            className={cn(
              'relative flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
              !prefersReducedMotion && 'duration-150',
              isSelected
                ? 'border-primary bg-primary/5 shadow-[0_0_0_2px_rgba(13,148,136,0.1)]'
                : 'border-border bg-white hover:border-primary/30',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors',
                isSelected ? 'bg-primary/10' : 'bg-subtle'
              )}
            >
              {method.icon}
            </div>

            {/* Content */}
            <div className="flex-1">
              <p className="font-semibold text-text">{method.name}</p>
              <p className="text-sm text-text-muted">{method.description}</p>
            </div>

            {/* Selection indicator */}
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                !prefersReducedMotion && 'duration-150',
                isSelected ? 'border-primary bg-primary text-white' : 'border-border bg-white'
              )}
            >
              {isSelected && <CheckIcon size="sm" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
