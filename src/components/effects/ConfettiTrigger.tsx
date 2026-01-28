'use client';

import { useEffect } from 'react';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { triggerConfetti, triggerCelebration, clearConfetti } from '@/lib/effects/confetti';

interface ConfettiTriggerProps {
  /** When true, triggers the confetti effect */
  trigger: boolean;
  /** Type of confetti effect */
  variant?: 'burst' | 'celebration';
  /** Duration for celebration variant (ms) */
  celebrationDuration?: number;
  /** Clear confetti when component unmounts */
  clearOnUnmount?: boolean;
}

/**
 * Declarative confetti component.
 * Respects reduced motion preference.
 */
export function ConfettiTrigger({
  trigger,
  variant = 'burst',
  celebrationDuration = 3000,
  clearOnUnmount = true,
}: ConfettiTriggerProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (trigger && !prefersReducedMotion) {
      if (variant === 'celebration') {
        cleanup = triggerCelebration(celebrationDuration);
      } else {
        triggerConfetti({ disableForReducedMotion: true });
      }
    }

    return () => {
      cleanup?.();
    };
  }, [trigger, variant, celebrationDuration, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (clearOnUnmount) {
        clearConfetti();
      }
    };
  }, [clearOnUnmount]);

  return null;
}
