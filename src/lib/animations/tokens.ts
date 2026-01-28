/**
 * Animation configuration tokens for consistent motion design.
 * Use these with Framer Motion or CSS animations.
 */
export const animations = {
  // Durations (in seconds for Framer Motion)
  duration: {
    instant: 0.1,
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
    page: 0.6,
  },

  // Easings (cubic-bezier arrays for Framer Motion)
  easing: {
    easeOut: [0, 0, 0.2, 1] as const,
    easeOutExpo: [0.16, 1, 0.3, 1] as const,
    easeInOut: [0.4, 0, 0.2, 1] as const,
    spring: [0.34, 1.56, 0.64, 1] as const,
  },

  // Pre-built transitions
  transition: {
    default: { duration: 0.3, ease: [0, 0, 0.2, 1] },
    entrance: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    spring: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
    exit: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },

  // Stagger delays
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.15,
  },
} as const;
