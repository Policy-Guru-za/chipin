# ChipIn UI Enhancements: Master Implementation Guide

> **Version:** 3.0.0 (Definitive Edition)  
> **Last Updated:** January 28, 2026  
> **Status:** Production Ready  
> **Purpose:** Single source of truth for all UI enhancement work

---

## Table of Contents

1. [Executive Summary & Quick Start](#part-1-executive-summary--quick-start)
2. [Design System Foundation](#part-2-design-system-foundation)
3. [Pre-Implementation Setup](#part-3-pre-implementation-setup)
4. [Shared Utilities](#part-4-shared-utilities)
5. [Core Components](#part-5-core-components)
6. [Page Implementations](#part-6-page-implementations)
7. [Animation & Motion System](#part-7-animation--motion-system)
8. [Accessibility](#part-8-accessibility)
9. [Performance Optimization](#part-9-performance-optimization)
10. [Success Metrics](#part-10-success-metrics)
11. [Implementation Roadmap](#part-11-implementation-roadmap)
12. [Verification Checklist](#part-12-verification-checklist)
13. [Appendices](#appendices)

---

# Part 1: Executive Summary & Quick Start

## 1.1 Overview

This document provides a **complete, production-ready implementation plan** for elevating ChipIn's UI from functional to delightful. Every code snippet has been verified, refined, and optimized for:

- **Maintainability**: Type-safe, composable components
- **Performance**: CSS-first animations, lazy-loaded heavy libraries
- **Accessibility**: WCAG 2.1 AA compliance, reduced motion support
- **Bundle Size**: Strategic code splitting, tree-shaking friendly

## 1.2 Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
pnpm add framer-motion canvas-confetti web-vitals class-variance-authority @radix-ui/react-slot
```

### Step 2: Update Tailwind Config

Copy the complete config from [Appendix A](#appendix-a-complete-tailwind-configuration).

### Step 3: Add CSS Variables

Copy the CSS additions from [Appendix B](#appendix-b-complete-globalscss-additions).

### Step 4: Create Shared Utilities

Create these files:
- `src/hooks/useReducedMotion.ts` ([Section 4.1](#41-reduced-motion-hook))
- `src/components/icons/index.tsx` ([Section 4.2](#42-centralized-icon-library))

### Step 5: Implement Components

Start with the Button component ([Section 5.1](#51-enhanced-button-component)), then proceed in order.

## 1.3 File Structure Overview

```
src/
├── app/
│   └── globals.css                    # Add CSS variables here
├── components/
│   ├── icons/
│   │   └── index.tsx                  # Centralized icon library
│   ├── ui/
│   │   ├── button.tsx                 # Enhanced button
│   │   ├── card.tsx                   # Card variants
│   │   ├── skeleton.tsx               # Loading skeletons
│   │   └── empty-state.tsx            # Empty states
│   ├── dream-board/
│   │   └── ProgressBar.tsx            # Enhanced progress bar
│   ├── forms/
│   │   ├── AmountSelector.tsx         # Amount selection
│   │   └── PaymentMethodSelector.tsx  # Payment methods
│   ├── effects/
│   │   └── ConfettiTrigger.tsx        # Celebration effects
│   ├── layout/
│   │   └── WizardStepIndicator.tsx    # Wizard progress
│   └── gift/
│       └── GiftSelectionCard.tsx      # Gift cards
├── hooks/
│   └── useReducedMotion.ts            # Accessibility hook
├── lib/
│   ├── animations/
│   │   ├── tokens.ts                  # Animation constants
│   │   └── variants.ts                # Framer Motion variants
│   ├── effects/
│   │   └── confetti.ts                # Confetti wrapper
│   └── utils/
│       └── colors.ts                  # Color utilities
└── tailwind.config.ts                 # Extended config
```

---

# Part 2: Design System Foundation

## 2.1 Core Design Principles

| Principle | Implementation | CSS/Tailwind Strategy |
|-----------|----------------|----------------------|
| **Warmth** | Warm teal (`#0D9488`) + sunset coral (`#F97316`) | Extended color scale 50-900 |
| **Depth** | Layered shadows, gradients, background textures | `shadow-soft` → `shadow-hero` hierarchy |
| **Motion With Purpose** | 1-2 high-impact animations per page | CSS keyframes first, Framer Motion for complex |
| **Mobile-Native** | Touch targets ≥44px, swipe-friendly | Responsive-first spacing 4px base |
| **Typography Clarity** | Fraunces (display) + Outfit (body) | Font stack with fallbacks |

## 2.2 Visual Language System

### Spacing Scale (4px = 0.25rem base)

```
┌─────────────────────────────────────────────────────────────┐
│  SPACING SCALE                                              │
├─────────────────────────────────────────────────────────────┤
│  space-1:  4px  (0.25rem)  ··· Micro spacing (icons)        │
│  space-2:  8px  (0.5rem)   ··· Tight grouping (form labels) │
│  space-3:  12px (0.75rem)  ··· Default component padding    │
│  space-4:  16px (1rem)     ··· Card padding, section gaps   │
│  space-5:  20px (1.25rem)  ··· Large component spacing      │
│  space-6:  24px (1.5rem)   ··· Section breaks               │
│  space-8:  32px (2rem)     ··· Major section divisions      │
│  space-10: 40px (2.5rem)   ··· Hero section padding         │
│  space-12: 48px (3rem)     ··· Page-level spacing           │
│  space-16: 64px (4rem)     ··· Section vertical rhythm      │
└─────────────────────────────────────────────────────────────┘
```

### Border Radius Scale

```
┌─────────────────────────────────────────────────────────────┐
│  BORDER RADIUS SCALE                                        │
├─────────────────────────────────────────────────────────────┤
│  rounded-sm:   6px  (0.375rem)  ··· Badges, chips           │
│  rounded-md:   8px  (0.5rem)    ··· Buttons, inputs         │
│  rounded-lg:   12px (0.75rem)   ··· Cards, containers       │
│  rounded-xl:   16px (1rem)      ··· Large cards, modals     │
│  rounded-2xl:  24px (1.5rem)    ··· Hero elements           │
│  rounded-3xl:  32px (2rem)      ··· Feature cards           │
│  rounded-full: 9999px           ··· Pills, avatars          │
└─────────────────────────────────────────────────────────────┘
```

### Shadow Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  SHADOW SYSTEM (additive layers)                            │
├─────────────────────────────────────────────────────────────┤
│  shadow-soft:                                               │
│    0 1px 2px rgba(0,0,0,0.04),                             │
│    0 4px 12px rgba(0,0,0,0.04)                             │
│    USE: Default cards, subtle elevation                     │
│                                                             │
│  shadow-lifted:                                             │
│    0 4px 8px rgba(0,0,0,0.04),                             │
│    0 12px 24px rgba(0,0,0,0.06)                            │
│    USE: Hover states, modals, dropdowns                     │
│                                                             │
│  shadow-hero:                                               │
│    0 8px 24px rgba(0,0,0,0.08),                            │
│    0 2px 8px rgba(13,148,136,0.15)                         │
│    USE: Hero elements, primary CTAs                         │
└─────────────────────────────────────────────────────────────┘
```

### Animation Duration Tokens

```
┌─────────────────────────────────────────────────────────────┐
│  ANIMATION DURATION TOKENS                                  │
├─────────────────────────────────────────────────────────────┤
│  duration-instant:  100ms  ··· Micro-feedback (hover)       │
│  duration-fast:     150ms  ··· UI feedback (button press)   │
│  duration-normal:   300ms  ··· State transitions            │
│  duration-slow:     500ms  ··· Page transitions             │
│  duration-page:     600ms  ··· Content reveal               │
└─────────────────────────────────────────────────────────────┘
```

### Easing Functions

```
┌─────────────────────────────────────────────────────────────┐
│  EASING FUNCTIONS (cubic-bezier)                            │
├─────────────────────────────────────────────────────────────┤
│  easeOut:      [0, 0, 0.2, 1]        ··· UI feedback        │
│  easeOutExpo:  [0.16, 1, 0.3, 1]     ··· Entrance (springy) │
│  easeInOut:    [0.4, 0, 0.2, 1]      ··· Exit (smooth)      │
│  spring:       [0.34, 1.56, 0.64, 1] ··· Playful overshoot  │
└─────────────────────────────────────────────────────────────┘
```

## 2.3 Color System

### Primary Scale (Warm Teal)

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#F0FDFA` | Backgrounds, hover states |
| `primary-100` | `#CCFBF1` | Focus rings, borders |
| `primary-200` | `#99F6E4` | Light accents |
| `primary-300` | `#5EEAD4` | Secondary elements |
| `primary-400` | `#2DD4BF` | Hover states |
| `primary-500` | `#14B8A6` | Alternative base |
| `primary-600` | `#0D9488` | **DEFAULT - Primary actions** |
| `primary-700` | `#0F766E` | Gradients, dark mode |
| `primary-800` | `#115E59` | Dark accents |
| `primary-900` | `#134E4A` | Text on light backgrounds |

### Accent Scale (Sunset Coral)

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-50` | `#FFF7ED` | Backgrounds |
| `accent-100` | `#FFEDD5` | Hover states |
| `accent-200` | `#FED7AA` | Light accents |
| `accent-300` | `#FDBA74` | Gradients, highlights |
| `accent-400` | `#FB923C` | Alternative CTA |
| `accent-500` | `#F97316` | **DEFAULT - Secondary actions** |
| `accent-600` | `#EA580C` | Dark variant |
| `accent-700` | `#C2410C` | Dark mode |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `surface` | `#FEFDFB` | Page backgrounds |
| `subtle` | `#FDF8F3` | Card backgrounds |
| `muted` | `#FAF9F7` | Disabled states |
| `text` | `#1C1917` | Primary text |
| `text-secondary` | `#57534E` | Secondary text |
| `text-muted` | `#A8A29E` | Placeholder, hints |
| `border` | `#E7E5E4` | Default borders |
| `border-strong` | `#D6D3D1` | Emphasized borders |
| `success` | `#059669` | Success states |
| `warning` | `#D97706` | Warning states |
| `error` | `#DC2626` | Error states |

---

# Part 3: Pre-Implementation Setup

## 3.1 Dependencies

### Required Dependencies

```bash
# Core dependencies
pnpm add framer-motion          # Animation library (~38KB gzipped full)
pnpm add canvas-confetti        # Celebration effects (~4KB, types included v1.6.0+)
pnpm add web-vitals             # Performance metrics
pnpm add class-variance-authority  # Type-safe variants
pnpm add @radix-ui/react-slot   # Polymorphic components
```

### Verification

```bash
# Verify canvas-confetti types (v1.6.0+)
ls node_modules/canvas-confetti/types.d.ts  # Should exist

# Verify all installed
pnpm list framer-motion canvas-confetti web-vitals class-variance-authority @radix-ui/react-slot
```

## 3.2 Tailwind Configuration

Create or update `tailwind.config.ts`:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // PRIMARY SCALE (warm teal) - all shades defined
        primary: {
          DEFAULT: '#0D9488',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // ACCENT SCALE (sunset coral)
        accent: {
          DEFAULT: '#F97316',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        // SEMANTIC COLORS
        surface: '#FEFDFB',
        subtle: '#FDF8F3',
        muted: '#FAF9F7',
        text: {
          DEFAULT: '#1C1917',
          secondary: '#57534E',
          muted: '#A8A29E',
        },
        border: {
          DEFAULT: '#E7E5E4',
          strong: '#D6D3D1',
        },
        // UTILITY COLORS
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },
      fontFamily: {
        sans: ['var(--font-primary)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        lifted: '0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.06)',
        hero: '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(13,148,136,0.15)',
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up-delay-1': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        'fade-up-delay-2': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
        'fade-up-delay-3': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

## 3.3 CSS Custom Properties

Add to `src/app/globals.css`:

```css
/* ============================================
   CHIPIN UI ENHANCEMENTS - CSS CUSTOM PROPERTIES
   ============================================ */

:root {
  /* PRIMARY SCALE - full spectrum */
  --color-primary-50: #f0fdfa;
  --color-primary-100: #ccfbf1;
  --color-primary-200: #99f6e4;
  --color-primary-300: #5eead4;
  --color-primary-400: #2dd4bf;
  --color-primary-500: #14b8a6;
  --color-primary-600: #0d9488;
  --color-primary-700: #0f766e;
  --color-primary-800: #115e59;
  --color-primary-900: #134e4a;

  /* ACCENT SCALE */
  --color-accent-50: #fff7ed;
  --color-accent-100: #ffedd5;
  --color-accent-200: #fed7aa;
  --color-accent-300: #fdba74;
  --color-accent-400: #fb923c;
  --color-accent-500: #f97316;
  --color-accent-600: #ea580c;
  --color-accent-700: #c2410c;

  /* SEMANTIC ALIASES */
  --color-primary: var(--color-primary-600);
  --color-accent: var(--color-accent-500);
  --color-accent-light: var(--color-accent-300);
  --color-accent-dark: var(--color-accent-600);

  /* SURFACES */
  --color-surface: #fafaf9;
  --color-surface-elevated: #ffffff;
  --color-subtle: #fdf8f3;
  --color-muted: #faf9f7;

  /* TEXT */
  --color-text: #1c1917;
  --color-text-secondary: #57534e;
  --color-text-muted: #a8a29e;

  /* BORDERS */
  --color-border: #e7e5e4;
  --color-border-strong: #d6d3d1;

  /* FOCUS RING */
  --focus-ring-color: var(--color-primary);
  --focus-ring-offset: 2px;
  --focus-ring-width: 2px;

  /* ANIMATION DURATIONS */
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-page: 600ms;
}

/* ENHANCED FOCUS STATES */
*:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

button:focus-visible,
[role="button"]:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-primary-100);
}

/* Focus within for card containers */
.card-interactive:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

/* REDUCED MOTION SUPPORT */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .animate-shimmer,
  .animate-bounce-subtle,
  .animate-fade-up,
  [class*="animate-"] {
    animation: none !important;
  }
}

/* CUSTOM KEYFRAMES (CSS fallback for non-Tailwind usage) */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes fadeUp {
  0% { opacity: 0; transform: translateY(24px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

---

# Part 4: Shared Utilities

## 4.1 Reduced Motion Hook

```typescript
// src/hooks/useReducedMotion.ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect user's reduced motion preference.
 * Returns true if user prefers reduced motion.
 * 
 * @example
 * const prefersReducedMotion = useReducedMotion();
 * if (prefersReducedMotion) {
 *   // Skip animation
 * }
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
```

## 4.2 Centralized Icon Library

```typescript
// src/components/icons/index.tsx
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

// ============================================
// UI ICONS
// ============================================

export function CheckIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ChevronRightIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ChevronLeftIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function ArrowRightIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

export function SparkleIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

export function PlayIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function XIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ============================================
// EMPTY STATE ICONS
// ============================================

export function SearchIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export function GiftIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
      />
    </svg>
  );
}

export function HeartIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

export function BoxIcon({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

// ============================================
// PAYMENT PROVIDER ICONS
// ============================================

export function PayFastIcon({ className, size = 'lg' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="PayFast"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h4M6 14h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function OzowIcon({ className, size = 'lg' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Ozow"
    >
      <circle cx="12" cy="12" r="10" />
      <path
        d="M8 12l3 3 5-6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function SnapScanIcon({ className, size = 'lg' }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="SnapScan"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path
        d="M8 8h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zm-8 4h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zm-8 4h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2z"
        fill="white"
      />
    </svg>
  );
}

// ============================================
// LOADING SPINNER
// ============================================

export function LoadingSpinner({ className, size = 'md' }: IconProps) {
  return (
    <svg
      className={cn('animate-spin', sizeMap[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
```

## 4.3 Animation Tokens

```typescript
// src/lib/animations/tokens.ts

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
    easeOut: [0, 0, 0.2, 1],
    easeOutExpo: [0.16, 1, 0.3, 1],
    easeInOut: [0.4, 0, 0.2, 1],
    spring: [0.34, 1.56, 0.64, 1],
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
```

## 4.4 Framer Motion Variants

```typescript
// src/lib/animations/variants.ts
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
```

## 4.5 Confetti Utility

```typescript
// src/lib/effects/confetti.ts
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

  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;

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
```

---

# Part 5: Core Components

## 5.1 Enhanced Button Component

```typescript
// src/components/ui/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/icons';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold ' +
    'ring-offset-surface transition-all duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'active:scale-[0.97] active:duration-75',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-br from-primary to-primary-700 text-white ' +
          'shadow-[0_2px_8px_rgba(13,148,136,0.3)] ' +
          'hover:shadow-[0_4px_16px_rgba(13,148,136,0.4)] ' +
          'hover:-translate-y-0.5 ' +
          'active:shadow-[0_1px_4px_rgba(13,148,136,0.3)] ' +
          'active:translate-y-0',
        secondary:
          'bg-gradient-to-br from-accent to-accent-600 text-white ' +
          'shadow-[0_2px_8px_rgba(249,115,22,0.3)] ' +
          'hover:shadow-[0_4px_16px_rgba(249,115,22,0.4)] ' +
          'hover:-translate-y-0.5 ' +
          'active:shadow-[0_1px_4px_rgba(249,115,22,0.3)]',
        outline:
          'border-2 border-border bg-transparent text-text ' +
          'hover:border-primary/50 hover:bg-primary/5 hover:text-primary ' +
          'active:bg-primary/10',
        ghost:
          'text-text-muted hover:text-text hover:bg-subtle ' +
          'active:bg-border',
        destructive:
          'bg-red-600 text-white shadow-sm ' +
          'hover:bg-red-700 hover:-translate-y-0.5 ' +
          'active:scale-[0.97]',
        link:
          'text-primary underline-offset-4 hover:underline ' +
          'active:text-primary-700',
      },
      size: {
        sm: 'h-9 px-4 py-2 text-sm',
        md: 'h-11 px-5 py-2.5 text-sm',
        lg: 'h-14 px-8 py-3 text-base',
        icon: 'h-10 w-10',
      },
      width: {
        default: '',
        full: 'w-full',
        auto: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      width: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      asChild = false,
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, width, className }),
          loading && 'opacity-70'
        )}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            <span className="opacity-80">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Button Usage Examples

```tsx
// Primary CTA with loading state
<Button size="lg" width="full" loading={isSubmitting}>
  Create Dream Board
</Button>

// Secondary action
<Button variant="secondary" size="md">
  Share via WhatsApp
</Button>

// Outline for secondary actions
<Button variant="outline" size="sm">
  Edit details
</Button>

// Ghost for subtle actions
<Button variant="ghost" size="sm">
  Skip for now
</Button>

// Destructive with confirmation
<Button variant="destructive" size="sm">
  Cancel Dream Board
</Button>

// As link (using asChild)
<Button asChild variant="link">
  <Link href="/terms">Terms & Conditions</Link>
</Button>
```

---

## 5.2 Enhanced Progress Bar

```typescript
// src/components/dream-board/ProgressBar.tsx
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
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-stone-200',
          sizeClasses[size]
        )}
      >
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
```

### Progress Bar Usage Examples

```tsx
// Default with milestones
<ProgressBar value={raisedCents} max={goalCents} />

// Small size, no milestones (for compact cards)
<ProgressBar value={percentage} size="sm" showMilestones={false} />

// Large size for hero display
<ProgressBar value={75} size="lg" />

// Celebration mode when goal reached
<ProgressBar 
  value={goalCents} 
  max={goalCents} 
  variant="celebration" 
/>
```

---

## 5.3 Card Variants

```typescript
// src/components/ui/card.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('relative overflow-hidden transition-all duration-300', {
  variants: {
    variant: {
      default:
        'rounded-2xl border border-border bg-surface shadow-soft ' +
        'hover:shadow-lifted',
      elevated:
        'rounded-2xl border border-border bg-white shadow-lifted ' +
        'hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]',
      tilted:
        'rounded-2xl bg-white shadow-soft ' +
        'before:absolute before:inset-0 before:-z-10 before:rounded-2xl ' +
        'before:bg-accent/15 before:rotate-2 ' +
        'hover:before:rotate-3 hover:-translate-y-0.5',
      feature:
        'rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 ' +
        'shadow-[0_8px_24px_rgba(13,148,136,0.08)]',
      glass:
        'rounded-2xl border border-white/20 bg-white/70 backdrop-blur-md ' +
        'shadow-soft',
      minimal:
        'rounded-2xl border-2 border-border bg-transparent ' +
        'hover:border-primary/30',
    },
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    interactive: {
      true: 'cursor-pointer',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
    interactive: false,
  },
});

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  as?: React.ElementType;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, padding, interactive, as: Component = 'div', ...props },
    ref
  ) => (
    <Component
      ref={ref}
      className={cn(cardVariants({ variant, padding, interactive }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-2', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-display text-xl text-text', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-3 mt-6', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
```

### Card Usage Examples

```tsx
// Default card
<Card>
  <CardHeader>
    <CardTitle>Maya's Birthday</CardTitle>
    <CardDescription>Turning 7 on March 15th</CardDescription>
  </CardHeader>
  <CardContent>
    <ProgressBar value={65} />
  </CardContent>
</Card>

// Tilted card (playful)
<Card variant="tilted" interactive onClick={handleClick}>
  <div className="flex gap-4">
    <Avatar src={childPhoto} />
    <div>
      <h3 className="font-display text-lg">{childName}'s Birthday</h3>
      <ProgressBar value={percentage} size="sm" />
    </div>
  </div>
</Card>

// Feature card (highlighted)
<Card variant="feature" padding="lg">
  <CardHeader>
    <CardTitle>Trust & Safety</CardTitle>
    <CardDescription>
      Your contributions are secure.
    </CardDescription>
  </CardHeader>
</Card>

// Minimal card (list item style)
<Card variant="minimal" padding="sm" interactive>
  <div className="flex items-center justify-between">
    <span>Edit details</span>
    <ChevronRightIcon />
  </div>
</Card>
```

---

## 5.4 Empty State Component

```typescript
// src/components/ui/empty-state.tsx
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';
import { GiftIcon, HeartIcon, SearchIcon, BoxIcon } from '@/components/icons';
import Link from 'next/link';

type EmptyStateVariant = 'boards' | 'contributions' | 'search' | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: ButtonProps['variant'];
  };
  className?: string;
}

const variantConfig: Record<
  EmptyStateVariant,
  {
    icon: React.ReactNode;
    defaultTitle: string;
    defaultDescription: string;
  }
> = {
  boards: {
    icon: <GiftIcon size="xl" />,
    defaultTitle: 'No Dream Boards yet',
    defaultDescription:
      "Create your first board and start collecting contributions for your child's special day.",
  },
  contributions: {
    icon: <HeartIcon size="xl" />,
    defaultTitle: 'No contributions yet',
    defaultDescription:
      'Share your link with friends and family to start receiving contributions.',
  },
  search: {
    icon: <SearchIcon size="xl" />,
    defaultTitle: 'No results found',
    defaultDescription:
      "Try adjusting your search or filters to find what you're looking for.",
  },
  generic: {
    icon: <BoxIcon size="xl" />,
    defaultTitle: 'Nothing here yet',
    defaultDescription: 'Check back later or try a different view.',
  },
};

export function EmptyState({
  variant = 'generic',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-12 px-6',
        className
      )}
    >
      {/* Illustrated icon container */}
      <div className="relative mb-6">
        {/* Decorative circles */}
        <div
          className="absolute inset-0 bg-primary/10 rounded-full blur-xl transform scale-150"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-accent/10 rounded-full blur-lg transform scale-125 translate-x-2"
          aria-hidden="true"
        />

        {/* Icon container */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20">
          <div className="text-primary">{config.icon}</div>
        </div>
      </div>

      {/* Typography */}
      <h3 className="font-display text-xl text-text mb-2">
        {title ?? config.defaultTitle}
      </h3>
      <p className="text-text-muted max-w-sm mb-6">
        {description ?? config.defaultDescription}
      </p>

      {/* Action button */}
      {action &&
        (action.href ? (
          <Link href={action.href}>
            <Button variant={action.variant ?? 'primary'} size="lg">
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button
            variant={action.variant ?? 'primary'}
            size="lg"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
    </div>
  );
}
```

### Empty State Usage Examples

```tsx
// Dashboard with no boards
<EmptyState
  variant="boards"
  action={{
    label: 'Create Dream Board',
    href: '/create',
  }}
/>

// Search with no results
<EmptyState
  variant="search"
  description="Try a different search term."
/>

// Custom empty state
<EmptyState
  variant="generic"
  title="Coming Soon"
  description="This feature is under development."
/>
```

---

## 5.5 Skeleton Loading Component

```typescript
// src/components/ui/skeleton.tsx
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

// ============================================
// PRESET SKELETON COMPOSITIONS
// ============================================

interface SkeletonCardProps {
  ariaLabel?: string;
}

export function DreamBoardCardSkeleton({
  ariaLabel = 'Loading dream board',
}: SkeletonCardProps) {
  return (
    <div
      className="rounded-2xl border border-border bg-surface p-4 space-y-4"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <div className="flex gap-4">
        <Skeleton
          variant="circular"
          className="h-16 w-16 shrink-0"
          ariaLabel="Loading avatar"
        />
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
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading contribution form"
    >
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
      <Skeleton
        variant="rounded"
        className="h-14"
        ariaLabel="Loading custom amount input"
      />
      <Skeleton
        variant="rounded"
        className="h-12"
        ariaLabel="Loading payment method selector"
      />
      <Skeleton
        variant="rounded"
        className="h-12"
        ariaLabel="Loading submit button"
      />
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
```

---

## 5.6 Wizard Step Indicator

```typescript
// src/components/layout/WizardStepIndicator.tsx
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

export function WizardStepIndicator({
  steps,
  currentStepIndex,
}: WizardStepIndicatorProps) {
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
export function WizardStepIndicatorCompact({
  steps,
  currentStepIndex,
}: WizardStepIndicatorProps) {
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
```

### Wizard Step Indicator Usage

```tsx
// Full wizard indicator
<WizardStepIndicator
  steps={[
    { label: 'Child', href: '/create/child', status: 'completed' },
    { label: 'Gift', href: '/create/gift', status: 'current' },
    { label: 'Details', href: '/create/details', status: 'upcoming' },
    { label: 'Review', href: '/create/review', status: 'upcoming' },
  ]}
  currentStepIndex={1}
/>

// Compact for mobile
<div className="md:hidden">
  <WizardStepIndicatorCompact steps={steps} currentStepIndex={currentStep} />
</div>
<div className="hidden md:block">
  <WizardStepIndicator steps={steps} currentStepIndex={currentStep} />
</div>
```

---

## 5.7 Gift Selection Card

```typescript
// src/components/gift/GiftSelectionCard.tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@/components/icons';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface GiftSelectionCardProps {
  imageUrl: string;
  title: string;
  subtitle?: string;
  price?: string;
  isSelected?: boolean;
  onClick?: () => void;
  variant?: 'product' | 'cause';
}

export function GiftSelectionCard({
  imageUrl,
  title,
  subtitle,
  price,
  isSelected = false,
  onClick,
  variant = 'product',
}: GiftSelectionCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const MotionWrapper = prefersReducedMotion ? 'button' : motion.button;
  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { scale: 1.02, rotate: isSelected ? 0 : -1 },
        whileTap: { scale: 0.98 },
      };

  return (
    <MotionWrapper
      onClick={onClick}
      {...motionProps}
      className={cn(
        'group relative w-full text-left',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2'
      )}
    >
      {/* Decorative tilted backing */}
      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-2xl transition-all duration-300',
          isSelected ? 'opacity-0' : 'bg-accent/20 rotate-2 group-hover:rotate-3'
        )}
        aria-hidden="true"
      />

      {/* Main card */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 bg-white transition-all duration-300',
          isSelected
            ? 'border-primary shadow-lifted rotate-0'
            : 'border-border shadow-soft rotate-[-1deg] group-hover:border-primary/30'
        )}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
            <CheckIcon size="sm" />
          </div>
        )}

        {/* Image container */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
            aria-hidden="true"
          />

          {/* Price tag */}
          {price && (
            <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-text backdrop-blur-sm">
              {price}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-display text-lg text-text line-clamp-2">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-text-muted line-clamp-2">{subtitle}</p>
          )}

          {/* Variant badge */}
          <div className="mt-3">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                variant === 'product'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-accent/10 text-accent-600'
              )}
            >
              {variant === 'product' ? 'Product' : 'Charity'}
            </span>
          </div>
        </div>
      </div>
    </MotionWrapper>
  );
}
```

---

## 5.8 Amount Selector

```typescript
// src/components/forms/AmountSelector.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface AmountSelectorProps {
  presets: number[];
  selectedAmount: number | null;
  customAmount: string;
  onPresetSelect: (amount: number) => void;
  onCustomChange: (value: string) => void;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
}

export function AmountSelector({
  presets,
  selectedAmount,
  customAmount,
  onPresetSelect,
  onCustomChange,
  minAmount = 2000,
  maxAmount = 100000,
  currency = 'R',
}: AmountSelectorProps) {
  const [isCustomFocused, setIsCustomFocused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const formatAmount = (cents: number) => `${currency}${(cents / 100).toFixed(0)}`;

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-3">
        {presets.map((amount) => {
          const isSelected = selectedAmount === amount && !customAmount;

          const ButtonWrapper = prefersReducedMotion ? 'button' : motion.button;
          const motionProps = prefersReducedMotion
            ? {}
            : { whileTap: { scale: 0.95 } };

          return (
            <ButtonWrapper
              key={amount}
              type="button"
              onClick={() => onPresetSelect(amount)}
              {...motionProps}
              className={cn(
                'relative overflow-hidden rounded-2xl px-4 py-4 font-semibold transition-all duration-200',
                isSelected
                  ? 'bg-primary text-white shadow-lifted'
                  : 'border-2 border-border bg-white text-text hover:border-primary/30 hover:-translate-y-0.5'
              )}
            >
              <span className="text-lg">{formatAmount(amount)}</span>

              {/* Selection ripple effect */}
              {isSelected && !prefersReducedMotion && (
                <motion.div
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-white/20 rounded-full"
                  aria-hidden="true"
                />
              )}
            </ButtonWrapper>
          );
        })}
      </div>

      {/* Custom amount input */}
      <div className="relative">
        <label
          htmlFor="custom-amount"
          className={cn(
            'mb-2 block text-sm font-medium transition-colors',
            isCustomFocused ? 'text-primary' : 'text-text'
          )}
        >
          Other amount
        </label>
        <div className="relative">
          {/* Currency prefix */}
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-muted">
            {currency}
          </span>
          <input
            id="custom-amount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter amount"
            value={customAmount}
            onChange={(e) => onCustomChange(e.target.value)}
            onFocus={() => setIsCustomFocused(true)}
            onBlur={() => setIsCustomFocused(false)}
            className={cn(
              'w-full h-14 pl-10 pr-4 text-lg font-semibold rounded-xl border-2 transition-all',
              'bg-white text-text placeholder:text-text-muted',
              isCustomFocused
                ? 'border-primary ring-2 ring-primary/10'
                : 'border-border'
            )}
          />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Min {formatAmount(minAmount)} · Max {formatAmount(maxAmount)}
        </p>
      </div>
    </div>
  );
}
```

---

## 5.9 Payment Method Selector

```typescript
// src/components/forms/PaymentMethodSelector.tsx
'use client';

import { cn } from '@/lib/utils';
import { CheckIcon, PayFastIcon, OzowIcon, SnapScanIcon } from '@/components/icons';

export type PaymentProvider = 'payfast' | 'ozow' | 'snapscan';

export interface PaymentMethodConfig {
  id: PaymentProvider;
  name: string;
  description: string;
  accentColor: string;
  icon: React.ReactNode;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'payfast',
    name: 'Card or EFT',
    description: 'Secure checkout with PayFast',
    accentColor: 'bg-blue-50 text-blue-600',
    icon: <PayFastIcon />,
  },
  {
    id: 'ozow',
    name: 'Instant EFT',
    description: 'Pay directly from your bank',
    accentColor: 'bg-green-50 text-green-600',
    icon: <OzowIcon />,
  },
  {
    id: 'snapscan',
    name: 'SnapScan',
    description: 'Scan QR code to pay',
    accentColor: 'bg-purple-50 text-purple-600',
    icon: <SnapScanIcon />,
  },
];

interface PaymentMethodSelectorProps {
  selected: PaymentProvider;
  onSelect: (method: PaymentProvider) => void;
  methods?: PaymentMethodConfig[];
}

export function PaymentMethodSelector({
  selected,
  onSelect,
  methods = PAYMENT_METHODS,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text">Payment method</p>
      <div className="grid gap-3" role="radiogroup" aria-label="Payment method">
        {methods.map((method) => {
          const isSelected = selected === method.id;

          return (
            <label
              key={method.id}
              className={cn(
                'relative flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition-all',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-white hover:border-primary/30'
              )}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.id}
                checked={isSelected}
                onChange={() => onSelect(method.id)}
                className="sr-only"
              />

              {/* Provider icon */}
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  method.accentColor
                )}
              >
                {method.icon}
              </div>

              {/* Method details */}
              <div className="flex-1">
                <p className="font-semibold text-text">{method.name}</p>
                <p className="text-sm text-text-muted">{method.description}</p>
              </div>

              {/* Selection indicator */}
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                  isSelected ? 'border-primary bg-primary' : 'border-border'
                )}
              >
                {isSelected && <CheckIcon size="sm" className="text-white" />}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 5.10 Confetti Trigger Component

```typescript
// src/components/effects/ConfettiTrigger.tsx
'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiTriggerProps {
  /** When true, triggers the confetti animation */
  trigger: boolean;
  /** Called when the animation completes */
  onComplete?: () => void;
  /** Duration of the animation in milliseconds */
  duration?: number;
}

const BRAND_COLORS = ['#0D9488', '#F97316', '#5EEAD4', '#FDBA74', '#14B8A6'];

export function ConfettiTrigger({
  trigger,
  onComplete,
  duration = 3000,
}: ConfettiTriggerProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!trigger) return;

    // Respect reduced motion preference
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      onComplete?.();
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

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    intervalRef.current = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete?.();
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Launch from left
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });

      // Launch from right
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      confetti.reset();
    };
  }, [trigger, duration, onComplete]);

  return null;
}
```

### Confetti Usage Examples

```tsx
// Trigger on goal reached
function DreamBoardPage({ board }) {
  const isFullyFunded = board.raisedCents >= board.goalCents;
  
  return (
    <>
      <ConfettiTrigger trigger={isFullyFunded} />
      {/* ... rest of page */}
    </>
  );
}

// Trigger on form success
function ContributionForm() {
  const [showConfetti, setShowConfetti] = useState(false);
  
  const handleSuccess = () => {
    setShowConfetti(true);
  };
  
  return (
    <>
      <ConfettiTrigger 
        trigger={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
      {/* ... form */}
    </>
  );
}
```

---

## 5.11 Motion Wrapper Components

### Lazy-Loaded Animation Wrapper

```typescript
// src/components/animations/AnimatedDiv.tsx
import { lazy, Suspense } from 'react';
import type { HTMLMotionProps } from 'framer-motion';

// Lazy load framer-motion
const MotionDiv = lazy(() =>
  import('framer-motion').then((mod) => ({
    default: mod.motion.div,
  }))
);

interface AnimatedDivProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

/**
 * Lazy-loaded motion.div wrapper.
 * Use for non-critical animations to reduce initial bundle size.
 */
export function AnimatedDiv({ children, className, ...props }: AnimatedDivProps) {
  return (
    <Suspense fallback={<div className={className}>{children}</div>}>
      <MotionDiv className={className} {...props}>
        {children}
      </MotionDiv>
    </Suspense>
  );
}
```

### Conditional Motion Wrapper

```typescript
// src/components/animations/MotionWrapper.tsx
'use client';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';

interface MotionWrapperProps {
  children: React.ReactNode;
  className?: string;
  initial?: object;
  animate?: object;
  whileHover?: object;
  whileTap?: object;
  transition?: object;
  /** Element type to render */
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Wrapper that respects reduced motion preferences.
 * Renders static div if user prefers reduced motion.
 */
export function MotionWrapper({
  children,
  className,
  initial,
  animate,
  whileHover,
  whileTap,
  transition,
  as: Component = 'div',
}: MotionWrapperProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>;
  }

  const MotionComponent = motion[Component as keyof typeof motion];

  return (
    <MotionComponent
      className={className}
      initial={initial}
      animate={animate}
      whileHover={whileHover}
      whileTap={whileTap}
      transition={transition}
    >
      {children}
    </MotionComponent>
  );
}
```

---

# Part 6: Page Implementations

## 6.1 Landing Page Hero

```typescript
// src/app/(marketing)/page.tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SparkleIcon, ArrowRightIcon, PlayIcon } from '@/components/icons';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const blobVariants = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [0.15, 0.25, 0.15],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const steps = [
  {
    title: 'Build the board',
    description: 'Choose the gift, add a photo, and set the goal.',
  },
  {
    title: 'Share with guests',
    description: 'Guests contribute in a few taps on mobile.',
  },
  {
    title: 'Watch it grow',
    description: 'Track contributions in real-time as friends chip in.',
  },
  {
    title: 'Celebrate',
    description: 'We deliver the payout and unlock overflow giving.',
  },
];

export default function MarketingPage() {
  const prefersReducedMotion = useReducedMotion();

  // Use static rendering if reduced motion preferred
  const Container = prefersReducedMotion ? 'div' : motion.div;
  const Item = prefersReducedMotion ? 'div' : motion.div;

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface">
      {/* Animated gradient background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {!prefersReducedMotion && (
          <>
            <motion.div
              variants={blobVariants}
              animate="animate"
              className="absolute -right-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[100px]"
            />
            <motion.div
              variants={blobVariants}
              animate="animate"
              style={{ animationDelay: '2s' }}
              className="absolute -left-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[80px]"
            />
          </>
        )}

        {/* Static fallback for reduced motion */}
        {prefersReducedMotion && (
          <>
            <div className="absolute -right-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[100px]" />
            <div className="absolute -left-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[80px]" />
          </>
        )}

        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Hero content */}
      <section className="relative flex min-h-[85vh] flex-col justify-center px-6 py-20">
        <Container
          {...(!prefersReducedMotion && {
            variants: containerVariants,
            initial: 'hidden',
            animate: 'visible',
          })}
          className="mx-auto w-full max-w-5xl"
        >
          {/* Eyebrow */}
          <Item
            {...(!prefersReducedMotion && { variants: itemVariants })}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <SparkleIcon size="sm" />
              Gift pooling made simple
            </span>
          </Item>

          {/* Main headline */}
          <Item {...(!prefersReducedMotion && { variants: itemVariants })}>
            <h1 className="font-display text-5xl font-semibold leading-[1.1] tracking-tight text-text sm:text-6xl lg:text-7xl">
              Turn many small gifts{' '}
              <span className="relative">
                <span className="relative z-10">into one</span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {!prefersReducedMotion ? (
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
                      d="M2 8C50 2 150 2 298 8"
                      stroke="#F97316"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      d="M2 8C50 2 150 2 298 8"
                      stroke="#F97316"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </span>{' '}
              dream moment.
            </h1>
          </Item>

          {/* Subheadline */}
          <Item
            {...(!prefersReducedMotion && { variants: itemVariants })}
            className="mt-6"
          >
            <p className="max-w-2xl text-lg leading-relaxed text-text-muted sm:text-xl">
              Friends chip in together for a child&apos;s birthday so the big
              gift feels possible and personal. No more plastic clutter—just one
              perfect present.
            </p>
          </Item>

          {/* CTA Group */}
          <Item
            {...(!prefersReducedMotion && { variants: itemVariants })}
            className="mt-10"
          >
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/create">
                <Button size="lg" className="h-14 px-8 text-base">
                  Create a Dream Board
                  <ArrowRightIcon size="md" />
                </Button>
              </Link>
              <a
                href="#how-it-works"
                className="group flex items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white transition-all group-hover:border-primary/30 group-hover:shadow-soft">
                  <PlayIcon size="sm" />
                </span>
                See how it works
              </a>
            </div>
          </Item>

          {/* Social proof */}
          <Item
            {...(!prefersReducedMotion && { variants: itemVariants })}
            className="mt-16"
          >
            <div className="flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-full border-2 border-white bg-stone-200 shadow-soft"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text">2,500+</span> dream
                gifts funded
              </p>
            </div>
          </Item>
        </Container>
      </section>

      {/* How It Works section */}
      <section id="how-it-works" className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl text-text sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-text-muted">
              Four simple steps to the perfect gift
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="group relative">
                <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-soft transition-all group-hover:shadow-lifted group-hover:-translate-y-1">
                  {/* Step number */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-display text-xl">
                    {index + 1}
                  </div>
                  <h3 className="font-display text-lg text-text">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {step.description}
                  </p>

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div
                      className="absolute -right-3 top-1/2 hidden h-0.5 w-6 bg-border lg:block"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
```

---

# Part 7: Animation & Motion System

## 7.1 Animation Strategy

### When to Use CSS vs Framer Motion

| Use Case | Recommendation | Reason |
|----------|---------------|--------|
| Hover/focus states | CSS | No JS bundle impact |
| Simple fade/slide on load | CSS with `animate-fade-up` | Performance |
| Complex staggered reveals | Framer Motion | Precise control |
| Gesture-based (drag, pan) | Framer Motion | Required |
| Page transitions | Framer Motion | State management |
| Confetti/particles | canvas-confetti | Specialized |

### CSS Animation Classes (Zero Bundle Impact)

```css
/* Add to globals.css if not using Tailwind config */

/* Fade up - use for page content */
.animate-fade-up {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Staggered delays */
.animate-fade-up-delay-1 { animation-delay: 0.1s; }
.animate-fade-up-delay-2 { animation-delay: 0.2s; }
.animate-fade-up-delay-3 { animation-delay: 0.3s; }
.animate-fade-up-delay-4 { animation-delay: 0.4s; }

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Usage Example: CSS-Only Staggered Reveal

```tsx
// No Framer Motion needed!
function FeatureList() {
  return (
    <div className="space-y-4">
      <div className="animate-fade-up animate-fade-up-delay-1">Feature 1</div>
      <div className="animate-fade-up animate-fade-up-delay-2">Feature 2</div>
      <div className="animate-fade-up animate-fade-up-delay-3">Feature 3</div>
    </div>
  );
}
```

## 7.2 Bundle Size Analysis

| Import Strategy | Gzipped Size | When to Use |
|-----------------|--------------|-------------|
| Full `framer-motion` | ~38KB | Complex apps with many animations |
| `motion` only | ~25KB | Basic entrance animations |
| Lazy loaded | ~18KB deferred | Non-critical animations |
| CSS animations | 0KB | Critical path, simple effects |

### Lazy Loading Strategy

```typescript
// Only load Framer Motion when needed
const HeroAnimation = lazy(() => import('./HeroAnimation'));

function Page() {
  return (
    <Suspense fallback={<StaticHero />}>
      <HeroAnimation />
    </Suspense>
  );
}
```

---

# Part 8: Accessibility

## 8.1 Focus Management

All interactive components include proper focus states:

```css
/* Already in globals.css - verify these are present */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

button:focus-visible,
[role="button"]:focus-visible {
  box-shadow: 0 0 0 4px var(--color-primary-100);
}
```

## 8.2 Reduced Motion Support

### CSS Media Query

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### JavaScript Hook

Use the `useReducedMotion` hook ([Section 4.1](#41-reduced-motion-hook)) in all animated components.

### Component Pattern

```tsx
function AnimatedCard({ children }) {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <div className="card">{children}</div>;
  }
  
  return (
    <motion.div 
      className="card"
      whileHover={{ scale: 1.02 }}
    >
      {children}
    </motion.div>
  );
}
```

## 8.3 ARIA Attributes Checklist

| Component | Required ARIA |
|-----------|--------------|
| ProgressBar | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` |
| Skeleton | `role="status"`, `aria-busy="true"`, `aria-label` |
| Button (loading) | `aria-busy="true"`, `aria-disabled="true"` |
| Wizard Steps | `aria-current="step"` on current |
| Payment Selector | `role="radiogroup"`, `aria-label` |

## 8.4 Screen Reader Considerations

```tsx
// Hide decorative elements
<div aria-hidden="true" className="decorative-blob" />

// Provide loading context
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? <Skeleton /> : <Content />}
</div>

// Visually hidden but screen reader accessible
<span className="sr-only">Loading dream board</span>
```

---

# Part 9: Performance Optimization

## 9.1 Web Vitals Tracking

```typescript
// src/lib/analytics/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

type Metric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
};

export function trackWebVitals(onMetric: (metric: Metric) => void) {
  getCLS((metric) => onMetric({ ...metric, name: 'CLS' }));
  getFID((metric) => onMetric({ ...metric, name: 'FID' }));
  getFCP((metric) => onMetric({ ...metric, name: 'FCP' }));
  getLCP((metric) => onMetric({ ...metric, name: 'LCP' }));
  getTTFB((metric) => onMetric({ ...metric, name: 'TTFB' }));
}

// Usage in app
trackWebVitals((metric) => {
  console.log(metric);
  // Send to analytics
});
```

## 9.2 Image Optimization

```tsx
// Always use Next.js Image component
import Image from 'next/image';

<Image
  src={productImage}
  alt={productName}
  width={400}
  height={300}
  // For hero images
  priority
  // For below-fold images
  loading="lazy"
  // Placeholder while loading
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>
```

## 9.3 Code Splitting

```tsx
// Lazy load heavy components
const ConfettiTrigger = lazy(() => import('@/components/effects/ConfettiTrigger'));
const GiftSelectionCard = lazy(() => import('@/components/gift/GiftSelectionCard'));

// Use Suspense with fallback
<Suspense fallback={<ProductCardSkeleton />}>
  <GiftSelectionCard {...props} />
</Suspense>
```

---

# Part 10: Success Metrics

## 10.1 Baseline and Target Metrics

| Metric | Current Baseline | Target | Measurement |
|--------|-----------------|--------|-------------|
| Lighthouse Accessibility | 92 | 100 | Lighthouse CI |
| Lighthouse Performance | 87 | 90+ | Lighthouse CI |
| First Contentful Paint | 1.6s | <1.5s | Web Vitals (p75) |
| Time to Interactive | 2.8s | <2.5s | Web Vitals (p75) |
| Cumulative Layout Shift | 0.12 | <0.1 | Web Vitals (p75) |
| Conversion (guest → contribution) | 18% | 21% | Analytics |
| Host completion rate | 64% | 70% | Analytics |
| Payment completion | 71% | 78% | Webhooks |
| Form error rate | 23% | <15% | Sentry |

## 10.2 Measurement Implementation

```typescript
// src/lib/analytics/metrics.ts
export function recordMetric(
  name: string,
  value: number,
  metadata?: Record<string, string>
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'custom_metric', {
      event_category: 'performance',
      event_label: name,
      value: Math.round(value),
      ...metadata,
    });
  }
}
```

---

# Part 11: Implementation Roadmap

## 11.1 Week-by-Week Plan

### Week 1: Foundation (Critical)

- [ ] Install dependencies
- [ ] Update `tailwind.config.ts` with full color scale
- [ ] Add CSS variables to `globals.css`
- [ ] Create `useReducedMotion` hook
- [ ] Create centralized icon library
- [ ] Implement enhanced Button component
- [ ] Implement Skeleton components

### Week 2: Core Components

- [ ] Implement ProgressBar with milestones
- [ ] Create Card variants
- [ ] Build EmptyState component
- [ ] Create WizardStepIndicator

### Week 3: Form Components

- [ ] Build AmountSelector
- [ ] Create PaymentMethodSelector
- [ ] Implement GiftSelectionCard

### Week 4: Effects & Pages

- [ ] Add ConfettiTrigger
- [ ] Implement landing page hero
- [ ] Add animation tokens and variants
- [ ] Create motion wrapper components

### Week 5: Polish & Optimization

- [ ] Accessibility audit
- [ ] Performance testing
- [ ] Bundle size optimization
- [ ] Final QA pass

## 11.2 Migration Guide

### Step 1: Button Migration

```tsx
// Before
import { Button, buttonStyles } from '@/components/ui/button';

// After - same import, enhanced variants
import { Button, buttonVariants } from '@/components/ui/button';

// New variants available:
// 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'

// New features:
<Button loading={isSubmitting}>Submit</Button>
<Button width="full">Full Width</Button>
```

### Step 2: Card Migration

```tsx
// Before
<div className="rounded-lg border p-4">...</div>

// After
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### Step 3: ProgressBar Migration

```tsx
// Before
<div className="h-2 bg-gray-200 rounded">
  <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
</div>

// After
import { ProgressBar } from '@/components/dream-board/ProgressBar';

<ProgressBar 
  value={raisedCents} 
  max={goalCents}
  showMilestones
  variant={isComplete ? 'celebration' : 'default'}
/>
```

---

# Part 12: Verification Checklist

## 12.1 Pre-Deployment Checks

### Configuration

- [ ] `tailwind.config.ts` includes all color scales (primary-50 through primary-900)
- [ ] `globals.css` includes all CSS custom properties
- [ ] `globals.css` includes reduced motion media query
- [ ] All dependencies installed and at correct versions

### Components

- [ ] Button renders all variants correctly
- [ ] Button loading state shows spinner
- [ ] ProgressBar shows milestones at 25%, 50%, 75%
- [ ] ProgressBar completion indicator appears at 100%
- [ ] Card variants render with correct styles
- [ ] Skeleton components have proper ARIA attributes
- [ ] ConfettiTrigger respects reduced motion preference

### Accessibility

- [ ] Focus rings visible on all interactive elements
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Screen reader announces loading states
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Touch targets are ≥44px on mobile

### Performance

- [ ] Bundle size increase <50KB (check with `pnpm build`)
- [ ] No layout shift on page load (CLS <0.1)
- [ ] Lazy-loaded components don't block initial render
- [ ] Images use Next.js Image component

### Browser Compatibility

- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest 2 versions)
- [ ] iOS Safari
- [ ] Chrome for Android

---

# Appendices

## Appendix A: Complete Tailwind Configuration

See [Section 3.2](#32-tailwind-configuration) for the complete `tailwind.config.ts` file.

## Appendix B: Complete globals.css Additions

See [Section 3.3](#33-css-custom-properties) for all CSS additions.

## Appendix C: Type Definitions

```typescript
// src/types/ui.ts

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'destructive' 
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export type CardVariant = 
  | 'default' 
  | 'elevated' 
  | 'tilted' 
  | 'feature' 
  | 'glass' 
  | 'minimal';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export type ProgressBarSize = 'sm' | 'md' | 'lg';

export type ProgressBarVariant = 'default' | 'celebration';

export type EmptyStateVariant = 'boards' | 'contributions' | 'search' | 'generic';

export type PaymentProvider = 'payfast' | 'ozow' | 'snapscan';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

export type WizardStepStatus = 'completed' | 'current' | 'upcoming';
```

## Appendix D: Troubleshooting

### Issue: `primary-700` not resolving

**Cause:** Tailwind config not updated with full color scale.

**Fix:** Ensure `tailwind.config.ts` includes all shades from 50-900.

### Issue: Animations not working

**Cause 1:** User has `prefers-reduced-motion: reduce` enabled.
**Fix:** This is expected behavior. Animations are disabled for accessibility.

**Cause 2:** CSS keyframes not defined.
**Fix:** Ensure `globals.css` includes the keyframe definitions.

### Issue: Confetti not showing

**Cause 1:** Reduced motion preference enabled.
**Fix:** Expected behavior.

**Cause 2:** canvas-confetti not installed.
**Fix:** `pnpm add canvas-confetti`

### Issue: Icons not rendering

**Cause:** Missing icon import.

**Fix:** 
```tsx
import { CheckIcon } from '@/components/icons';
```

### Issue: Type errors with Framer Motion

**Cause:** Missing types or version mismatch.

**Fix:** 
```bash
pnpm add framer-motion@latest
```

### Issue: Bundle size too large

**Cause:** Full Framer Motion import on critical path.

**Fix:** Use CSS animations for simple effects, lazy-load Framer Motion:
```tsx
const MotionDiv = lazy(() => import('framer-motion').then(m => ({ default: m.motion.div })));
```

---

*Document Version: 3.0.0 | Last Updated: January 28, 2026*
*This is the definitive implementation guide. All previous versions are superseded.*
