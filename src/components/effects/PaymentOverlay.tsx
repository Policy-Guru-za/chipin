'use client';

import { LazyMotion, domAnimation, m } from 'framer-motion';

import { LoadingSpinner } from '@/components/icons';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type PaymentProvider = 'payfast' | 'ozow';

interface PaymentOverlayProps {
  provider: PaymentProvider;
}

const providerLabels: Record<PaymentProvider, string> = {
  payfast: 'PayFast',
  ozow: 'Ozow',
};

export function PaymentOverlay({ provider }: PaymentOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const providerName = providerLabels[provider];

  const overlayProps = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2 },
      };

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        {...overlayProps}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm"
        role="alert"
        aria-live="assertive"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-6 px-6 text-center">
          {!prefersReducedMotion && <LoadingSpinner size="xl" className="text-primary" />}

          <div className="space-y-2">
            <p className="text-xl font-semibold text-text">Redirecting to {providerName}...</p>
            <p className="text-sm text-text-muted">
              Please wait while we connect you to the secure payment page.
            </p>
          </div>
        </div>
      </m.div>
    </LazyMotion>
  );
}
