import { animations } from './tokens';

/**
 * Fade up entrance animation.
 * Use for page content, cards, list items.
 */
export const fadeUpVariants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...animations.transition.entrance,
      delay,
    },
  }),
};

/**
 * Stagger container for child animations.
 * Wrap around a list of animated children.
 */
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: animations.stagger.normal,
      delayChildren: 0.2,
    },
  },
};

/**
 * Scale up entrance animation.
 * Use for modals, cards, popups.
 */
export const scaleUpVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: animations.transition.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: animations.transition.exit,
  },
};

/**
 * Slide in from right animation.
 * Use for mobile drawers, sidebars.
 */
export const slideInRightVariants = {
  hidden: {
    x: '100%',
  },
  visible: {
    x: 0,
    transition: animations.transition.entrance,
  },
  exit: {
    x: '100%',
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
  },
};

/**
 * Slide in from left animation.
 */
export const slideInLeftVariants = {
  hidden: {
    x: '-100%',
  },
  visible: {
    x: 0,
    transition: animations.transition.entrance,
  },
  exit: {
    x: '-100%',
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
  },
};

/**
 * Fade animation only (no transform).
 * Use when transform causes layout issues.
 */
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: animations.transition.default,
  },
  exit: {
    opacity: 0,
    transition: animations.transition.exit,
  },
};
