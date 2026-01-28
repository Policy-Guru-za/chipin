# UI Enhancements Implementation Proposal

**Source of truth:** `docs/UIs/UI-ENHANCEMENTS-MASTER.md` (version 3.0.0, 2026-01-28). This proposal mirrors the master plan exactly and introduces no scope deviations.

**Document purpose:** Provide a step-by-step, trackable implementation plan aligned to the master guide, with explicit deliverables, file targets, and verification gates.

**Status tracking:** Update checkboxes in-place as work progresses.

---

## 1) Scope (Locked)

### Foundation
- Tailwind theme extensions (full color scale, typography, shadows, radii)
- Global CSS variables, focus states, reduced motion rules, keyframes

### Shared Utilities
- `useReducedMotion` hook
- Centralized icon library
- Animation tokens + variants
- Confetti utilities

### Core Components
- Button (variants + loading)
- ProgressBar (milestones + celebration)
- Card variants
- EmptyState
- Skeleton presets
- WizardStepIndicator (full + compact)
- GiftSelectionCard
- AmountSelector
- PaymentMethodSelector
- ConfettiTrigger
- Motion wrapper components

### Pages & UX
- Marketing landing hero (section + “How it works” grid)

### Cross-Cutting Concerns
- Accessibility (focus, ARIA, reduced motion)
- Performance (bundle size, lazy loading)
- Success metrics (web vitals & custom metrics)
- Verification checklist

---

## 2) Conflict Resolution

- If an existing component exists, compare with the master plan and migrate using **Master §11.2 (Migration Guide)**.
- If naming conflicts appear, prefer master naming and update imports accordingly.
- If dependency versions diverge, prefer the pinned versions below unless incompatible with Next.js 16; document any deviation in this proposal.

---

## 3) Dependencies & Preflight Checks

> Verify presence before implementation; install only if missing.

- [ ] `framer-motion@^11.0.0`
- [ ] `canvas-confetti@^1.9.0`
- [ ] `web-vitals@^4.0.0`
- [ ] `class-variance-authority@^0.7.0`
- [ ] `@radix-ui/react-slot@^1.0.0`

**Preflight checklist**
- [ ] Confirm Tailwind setup (`tailwind.config.ts` + `globals.css`)
- [ ] Confirm `cn` utility path (`@/lib/utils`)
- [ ] Confirm icon entry point (`src/components/icons/index.tsx`) does not conflict
- [ ] Ensure `use client` usage only where required

---

## 4) Implementation Phases (Aligned to Master Roadmap)

### Week 1 — Foundation (Critical)

**Deliverables**
- [ ] Tailwind config updated with full color scales + fonts + shadows (Master §3.2)
- [ ] Global CSS variables added (Master §3.3)
- [ ] Focus-visible rules and reduced-motion support (Master §3.3, §8)
- [ ] `useReducedMotion` hook (Master §4.1)
- [ ] Icon library (Master §4.2)
- [ ] Enhanced Button (Master §5.1)
- [ ] Skeleton components (Master §5.5)

**Primary files**
- `tailwind.config.ts`
- `src/app/globals.css`
- `src/hooks/useReducedMotion.ts`
- `src/components/icons/index.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/skeleton.tsx`

**Acceptance criteria**
- [ ] Focus rings visible on keyboard navigation
- [ ] Reduced motion disables animations globally
- [ ] Button shows loading spinner, supports variants and width
- [ ] Skeletons include ARIA labels

### Week 2 — Core Components

**Deliverables**
- [ ] ProgressBar with milestones + celebration state (Master §5.2)
- [ ] Card variants + subcomponents (Master §5.3)
- [ ] EmptyState component (Master §5.4)
- [ ] WizardStepIndicator (full + compact) (Master §5.6)

**Primary files**
- `src/components/dream-board/ProgressBar.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/layout/WizardStepIndicator.tsx`

**Acceptance criteria**
- [ ] ProgressBar ARIA attributes present
- [ ] Card variants render per design
- [ ] EmptyState shows correct icon & CTA
- [ ] Wizard indicator supports current/completed/upcoming

### Week 3 — Form Components

**Deliverables**
- [ ] AmountSelector (preset + custom) (Master §5.8)
- [ ] PaymentMethodSelector (radio UX) (Master §5.9)
- [ ] GiftSelectionCard (motion + selection) (Master §5.7)

**Primary files**
- `src/components/forms/AmountSelector.tsx`
- `src/components/forms/PaymentMethodSelector.tsx`
- `src/components/gift/GiftSelectionCard.tsx`

**Acceptance criteria**
- [ ] Preset selection is clear with motion-safe fallback
- [ ] Radio group accessible and keyboard navigable
- [ ] Gift card handles selection + price tag

### Week 4 — Effects & Pages

**Deliverables**
- [ ] ConfettiTrigger component (Master §5.10)
- [ ] Animation tokens + variants (Master §4.3–§4.4)
- [ ] Motion wrappers (lazy + reduced-motion) (Master §5.11)
- [ ] Landing page hero + How It Works section (Master §6.1)

**Primary files**
- `src/components/effects/ConfettiTrigger.tsx`
- `src/lib/animations/tokens.ts`
- `src/lib/animations/variants.ts`
- `src/components/animations/AnimatedDiv.tsx`
- `src/components/animations/MotionWrapper.tsx`
- `src/app/(marketing)/page.tsx`

**Acceptance criteria**
- [ ] Confetti respects reduced motion
- [ ] Hero renders static fallback if reduced motion enabled
- [ ] Motion wrappers lazy-load properly

### Week 5 — Polish & Optimization

**Deliverables**
- [ ] Accessibility audit pass (Master §8)
- [ ] Performance review + bundle checks (Master §7.2, §9)
- [ ] Web Vitals + custom metric tracking (Master §9.1, §10.2)

**Primary files**
- `src/lib/analytics/web-vitals.ts`
- `src/lib/analytics/metrics.ts`

**Acceptance criteria**
- [ ] Lighthouse accessibility ≥ 100 target
- [ ] Bundle size increase < 50KB
- [ ] Metrics recorded for CLS/LCP/FCP/TTFB

---

## 5) Integration Points (No Scope Drift)

Use these components in existing flows only after they are implemented and verified:

- **Host creation flow**: `WizardStepIndicator`, `AmountSelector`
- **Contribution flow**: `PaymentMethodSelector`, `ConfettiTrigger`
- **Dream board views**: `ProgressBar`, `Card`, `EmptyState`

> Note: Integration should stay aligned to `docs/JOURNEYS.md` and existing routing.

---

## 6) Accessibility & Motion Standards

- [ ] All interactive elements use `:focus-visible` styling
- [ ] `useReducedMotion` or CSS media query used in animated components
- [ ] ARIA attributes applied per master checklist
- [ ] Touch target minimum 44px

---

## 7) Performance Standards

- [ ] Prefer CSS for simple transitions
- [ ] Lazy load Framer Motion in non-critical areas
- [ ] Use Next.js `Image` for all imagery
- [ ] Ensure CLS < 0.1 and FCP < 1.5s targets

---

## 8) Validation Plan

Run for each milestone and before completion:

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`

---

## 9) Verification Checklist (Mirror of Master)

### Configuration
- [ ] Full color scale in Tailwind
- [ ] CSS custom properties in `globals.css`
- [ ] Reduced-motion media query in `globals.css`

### Components
- [ ] Button variants + loading spinner
- [ ] ProgressBar milestones + completion indicator
- [ ] Card variants render correctly
- [ ] Skeleton ARIA attributes
- [ ] ConfettiTrigger respects reduced motion

### Accessibility
- [ ] Focus rings visible
- [ ] Reduced motion disables animations
- [ ] Screen reader loading announcements
- [ ] WCAG AA contrast

### Performance
- [ ] Bundle size increase < 50KB
- [ ] Lazy-loaded components don’t block render
- [ ] All images use `next/image`

### Browser Compatibility
- [ ] Chrome (latest 2)
- [ ] Firefox (latest 2)
- [ ] Safari (latest 2)
- [ ] Edge (latest 2)
- [ ] iOS Safari
- [ ] Chrome Android

---

## 10) Open Decisions (None)

All implementation details are fixed by `UI-ENHANCEMENTS-MASTER.md`.

---

## 11) Progress Tracker

| Phase | Status | Notes |
| --- | --- | --- |
| Week 1: Foundation | ☐ Not started |  |
| Week 2: Core components | ☐ Not started |  |
| Week 3: Form components | ☐ Not started |  |
| Week 4: Effects & pages | ☐ Not started |  |
| Week 5: Polish & optimization | ☐ Not started |  |

---

**Document Version:** 1.0.0 | **Created:** 2026-01-28
