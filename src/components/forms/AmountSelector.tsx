'use client';

import { useState, useCallback } from 'react';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface AmountSelectorProps {
  presets?: number[];
  currency?: string;
  value?: number | null;
  onChange?: (amountCents: number | null) => void;
  minAmount?: number;
  maxAmount?: number;
  className?: string;
}

const DEFAULT_PRESETS = [5000, 10000, 20000, 50000]; // cents

export function AmountSelector({
  presets = DEFAULT_PRESETS,
  currency = 'R',
  value,
  onChange,
  minAmount = 1000,
  maxAmount = 1000000,
  className,
}: AmountSelectorProps) {
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handlePresetClick = useCallback(
    (amountCents: number) => {
      setIsCustom(false);
      setCustomAmount('');
      onChange?.(amountCents);
    },
    [onChange]
  );

  const handleCustomFocus = useCallback(() => {
    setIsCustom(true);
    onChange?.(null);
  }, [onChange]);

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9]/g, '');
      setCustomAmount(rawValue);

      if (rawValue) {
        const cents = parseInt(rawValue, 10) * 100;
        if (cents >= minAmount && cents <= maxAmount) {
          onChange?.(cents);
        } else {
          onChange?.(null);
        }
      } else {
        onChange?.(null);
      }
    },
    [onChange, minAmount, maxAmount]
  );

  const formatCents = (cents: number) => {
    return `${currency}${(cents / 100).toLocaleString()}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preset amounts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {presets.map((amountCents) => {
          const isSelected = !isCustom && value === amountCents;
          return (
            <button
              key={amountCents}
              type="button"
              onClick={() => handlePresetClick(amountCents)}
              className={cn(
                'relative rounded-xl border-2 px-4 py-3 text-center font-semibold transition-all',
                !prefersReducedMotion && 'duration-150',
                isSelected
                  ? 'border-primary bg-primary/5 text-primary shadow-[0_0_0_2px_rgba(13,148,136,0.1)]'
                  : 'border-border bg-white text-text hover:border-primary/30 hover:bg-primary/5',
                !prefersReducedMotion && 'active:scale-[0.97]'
              )}
            >
              {formatCents(amountCents)}
            </button>
          );
        })}
      </div>

      {/* Custom amount input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <span className="text-text-muted">{currency}</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Custom amount"
          value={customAmount}
          onFocus={handleCustomFocus}
          onChange={handleCustomChange}
          className={cn(
            'w-full rounded-xl border-2 py-3 pl-10 pr-4 text-lg font-semibold transition-all',
            !prefersReducedMotion && 'duration-150',
            isCustom && customAmount
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border bg-white text-text placeholder:text-text-muted',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
          )}
        />
      </div>

      {/* Min/max hint */}
      <p className="text-center text-xs text-text-muted">
        Min {formatCents(minAmount)} · Max {formatCents(maxAmount)}
      </p>
    </div>
  );
}
