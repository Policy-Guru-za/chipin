import confetti from 'canvas-confetti';

export type ConfettiOptions = {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  disableForReducedMotion?: boolean;
};

const BRAND_COLORS = ['#0D9488', '#F97316', '#5EEAD4', '#FDBA74', '#14B8A6'];

/**
 * Trigger a confetti burst.
 * Respects user's reduced motion preference.
 */
export function triggerConfetti(options: ConfettiOptions = {}): void {
  if (
    options.disableForReducedMotion &&
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  confetti({
    particleCount: options.particleCount ?? 100,
    spread: options.spread ?? 70,
    origin: options.origin ?? { y: 0.6 },
    colors: options.colors ?? BRAND_COLORS,
  });
}

/**
 * Trigger a celebration burst from both sides.
 * Use for goal reached, purchase complete, etc.
 */
export function triggerCelebration(duration = 3000): void {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const animationEnd = Date.now() + duration;
  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 0,
    colors: BRAND_COLORS,
  };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

/**
 * Clear all confetti particles.
 */
export function clearConfetti(): void {
  confetti.reset();
}
