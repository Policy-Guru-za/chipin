# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **UI Foundation (Phase 1)**
  - Extended Tailwind color scales (primary/accent 50-900)
  - Animation keyframes: `shimmer`, `bounce-subtle`, `fadeUp`
  - `useReducedMotion` hook using `useSyncExternalStore`
  - Centralized icon library with 18+ icons
  - Skeleton component with presets (`DreamBoardCardSkeleton`, `ContributionFormSkeleton`, `ProductCardSkeleton`)

- **Core Components (Phase 2)**
  - `ProgressBar` with milestones, ARIA attributes, celebration mode
  - `Card` component with 6 variants (see migration guide below)
  - `EmptyState` component with variant-specific icons
  - `WizardStepIndicator` with full and compact variants

- **Form Components (Phase 3)**
  - `AmountSelector` with preset amounts, custom input, validation feedback
  - `PaymentMethodSelector` with radio-style selection
  - `GiftSelectionCard` with Framer Motion effects

- **Effects & Animations (Phase 4)**
  - Confetti utilities (`triggerConfetti`, `triggerCelebration`, `clearConfetti`)
  - Animation tokens and Framer Motion variants
  - `AnimatedDiv`, `MotionWrapper`, `StaggerContainer`, `LazyMotionWrapper`
  - `ConfettiTrigger` declarative component

- **Analytics (Phase 5)**
  - Web Vitals tracking (CLS, FCP, LCP, TTFB, INP)
  - Custom metrics tracking (7 event types)
  - Analytics API endpoints (`/api/internal/analytics`, `/api/internal/metrics`)

### Changed

- **Button Component**
  - Now uses CVA for variants
  - Added `loading` state with spinner
  - Added `asChild` prop for polymorphism
  - Added `destructive` and `link` variants
  - Changed export from `buttonStyles` to `buttonVariants`

### Migration Guide

#### Button: `buttonStyles` to `buttonVariants`

```diff
- import { buttonStyles } from '@/components/ui/button';
+ import { buttonVariants } from '@/components/ui/button';

- <Link className={buttonStyles({ ...props })}>
+ <Link className={buttonVariants({ ...props })}>
```

#### Card: New Variant System

The Card component now uses CVA variants instead of custom classes.

**Before (manual classes):**

```tsx
<div className="rounded-2xl border border-border bg-surface p-6 shadow-soft hover:shadow-lifted">
  Content
</div>
```

**After (Card variants):**

```tsx
import { Card } from '@/components/ui/card';

<Card variant="default" padding="md">
  Content
</Card>;
```

**Available Variants:**

| Variant    | Description                      | Use Case                           |
| ---------- | -------------------------------- | ---------------------------------- |
| `default`  | Standard card with subtle shadow | General content containers         |
| `elevated` | Higher elevation, lifts on hover | Featured content, important items  |
| `tilted`   | Playful tilted background effect | Dream board cards, fun UI elements |
| `feature`  | Gradient background, prominent   | Hero sections, feature highlights  |
| `glass`    | Frosted glass effect             | Overlays, modern aesthetic         |
| `minimal`  | Border only, transparent         | Form sections, subtle containers   |

**Available Padding:**

- `none` - No padding
- `sm` - 16px (p-4)
- `md` - 24px (p-6) - default
- `lg` - 32px (p-8)

**Interactive Cards:**

```tsx
<Card variant="elevated" interactive onClick={handleClick}>
  Clickable card
</Card>
```

**Composition:**

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

<Card variant="feature">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Main content here</CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>;
```
