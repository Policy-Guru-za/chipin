# ChipIn UX Specification

> **Version:** 1.0.0  
> **Last Updated:** January 2026  
> **Status:** Ready for Development

---

## Design Principles

### 1. Mobile-First, Desktop-Compatible

- Design for phone screens first (375px width baseline)
- Scale up gracefully to tablet and desktop
- Touch-friendly targets (minimum 44x44px)

### 2. Minimal Friction

- No app download required for guests
- Minimal form fields
- Smart defaults where possible
- Progressive disclosure (show complexity only when needed)
 - When gift is fully funded, guest view switches to charity overflow view (gift hidden)

### 3. Joyful & Celebratory

- Birthday is a celebration — UI should feel festive
- Use confetti, playful type, and positive feedback
- Avoid corporate/clinical aesthetics
- **No "AI slop"** — be distinctive and opinionated

### 4. Trust & Security Signals

- Clear payment provider branding
- Progress indicators
- Confirmation at every step
- Privacy-first messaging

---

## Design System

### Philosophy: No Generic AI Aesthetics

ChipIn must look **distinctive**, not like every other AI-generated landing page. We commit to:
- Real typography choices (not Inter/Roboto defaults)
- Custom color palette (not default Tailwind)
- Depth and texture (not flat white backgrounds)
- 1-2 high-impact animations (not micro-animations everywhere)

### Typography

**Font Pairing:**
```css
/* Primary: Outfit — geometric, friendly, modern */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

/* Display: Fraunces — playful optical serif for headlines */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');
```

**Usage:**
- **Fraunces** (display): Hero headlines, section titles, celebration moments
- **Outfit** (primary): Body text, UI elements, buttons, forms

**Scale:**
```css
--text-xs: 0.75rem;    /* 12px — captions */
--text-sm: 0.875rem;   /* 14px — helper text */
--text-base: 1rem;     /* 16px — body */
--text-lg: 1.125rem;   /* 18px — emphasis */
--text-xl: 1.25rem;    /* 20px — subheadings */
--text-2xl: 1.5rem;    /* 24px — card titles */
--text-3xl: 2rem;      /* 32px — section heads */
--text-4xl: 2.5rem;    /* 40px — hero mobile */
--text-5xl: 3.5rem;    /* 56px — hero desktop */
```

### Colors

**Custom Palette (NOT default Tailwind):**

```css
:root {
  /* Primary: Warm Teal — trust, calm, growth */
  --color-primary: #0D9488;
  --color-primary-50: #F0FDFA;
  --color-primary-100: #CCFBF1;
  --color-primary-200: #99F6E4;
  --color-primary-300: #5EEAD4;
  --color-primary-400: #2DD4BF;
  --color-primary-500: #14B8A6;
  --color-primary-600: #0D9488;  /* PRIMARY */
  --color-primary-700: #0F766E;
  --color-primary-800: #115E59;
  --color-primary-900: #134E4A;

  /* Accent: Sunset Coral — warmth, celebration, joy */
  --color-accent: #F97316;
  --color-accent-light: #FDBA74;
  --color-accent-dark: #EA580C;

  /* Background: Warm Cream (NOT pure white) */
  --color-bg: #FEFDFB;
  --color-bg-subtle: #FDF8F3;
  --color-bg-muted: #FAF9F7;

  /* Text: Warm Charcoal (NOT pure black) */
  --color-text: #1C1917;
  --color-text-secondary: #57534E;
  --color-text-muted: #A8A29E;

  /* Surfaces: Stone palette */
  --color-surface: #FAFAF9;
  --color-border: #E7E5E4;
  --color-border-strong: #D6D3D1;

  /* Semantic */
  --color-success: #059669;
  --color-warning: #D97706;
  --color-error: #DC2626;
}
```

**What We Avoid:**
- Pure white (#FFFFFF) backgrounds
- Pure black (#000000) text
- Purple-on-white clichés
- Default Tailwind gray scale
- Generic blue CTAs

### Backgrounds & Depth

**Hero Background (warm gradient with radial highlights):**
```css
.hero-bg {
  background: 
    radial-gradient(ellipse at 70% 20%, rgba(94, 234, 212, 0.15), transparent 50%),
    radial-gradient(ellipse at 30% 80%, rgba(249, 115, 22, 0.08), transparent 40%),
    var(--color-bg);
}
```

**Subtle Texture (noise overlay):**
```css
.textured::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  opacity: 0.025;
  pointer-events: none;
}
```

**Card Depth:**
```css
.card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 
    0 1px 2px rgba(0,0,0,0.03),
    0 4px 12px rgba(0,0,0,0.04);
}

.card:hover {
  box-shadow: 
    0 4px 8px rgba(0,0,0,0.04),
    0 12px 24px rgba(0,0,0,0.06);
  transform: translateY(-2px);
  transition: all 0.2s ease-out;
}
```

### Spacing

```css
/* Base unit: 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

### Border Radius

```css
--radius-sm: 6px;     /* Small elements */
--radius-md: 8px;     /* Buttons, inputs */
--radius-lg: 12px;    /* Cards */
--radius-xl: 16px;    /* Large cards */
--radius-2xl: 24px;   /* Hero elements */
--radius-full: 9999px; /* Pills, avatars */
```

---

## Motion & Animation

### Philosophy: High-Impact, Not Noise

We use **1-2 signature animations** per page, not micro-animations everywhere.

### Page Entrance (Staggered Reveal)

```css
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

.animate-in {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Stagger children */
.stagger > *:nth-child(1) { animation-delay: 0.1s; }
.stagger > *:nth-child(2) { animation-delay: 0.2s; }
.stagger > *:nth-child(3) { animation-delay: 0.3s; }
.stagger > *:nth-child(4) { animation-delay: 0.4s; }
```

### Progress Bar (Satisfying Fill)

```css
.progress-fill {
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Celebration (Goal Reached)

Use `canvas-confetti` for high-impact celebration:
```typescript
import confetti from 'canvas-confetti';

function celebrate() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#0D9488', '#F97316', '#5EEAD4', '#FDBA74'],
  });
}
```

### Button Feedback

```css
.btn {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0) scale(0.98);
}
```

### What We Avoid

- Random hover animations on everything
- Bouncing/pulsing icons
- Infinite spinners (use skeleton loaders or progress)
- Parallax scrolling
- Page transition animations (too heavy for mobile)

---

## Component Library

Using **shadcn/ui** as base, heavily customized for ChipIn's distinctive aesthetic.

### Buttons

```tsx
// Primary Button — Bold, tactile
<Button variant="primary" size="lg">
  Create Dream Board
</Button>

// Secondary Button — Subtle but present
<Button variant="secondary">
  Copy Link
</Button>

// Ghost Button — Minimal
<Button variant="ghost">
  Cancel
</Button>
```

**Button Styles:**
```css
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-700) 100%);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-family: var(--font-primary);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
  transition: all 0.15s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.4);
}

.btn-primary:active {
  transform: translateY(0) scale(0.98);
}

/* Amount selection buttons — tactile, chunky */
.btn-amount {
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-xl);
  font-weight: 600;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  border: 2px solid transparent;
  transition: all 0.15s ease;
}

.btn-amount:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
}

.btn-amount.selected {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}
```

### Form Inputs

```tsx
<Input
  label="Child's first name"
  placeholder="Maya"
  error={errors.childName?.message}
/>

<Textarea
  label="Personal message"
  placeholder="Maya would love your contribution..."
  maxLength={280}
  showCount
/>
```

**Input Styles:**
```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-family: var(--font-primary);
  font-size: var(--text-base);
  background: white;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.input::placeholder {
  color: var(--color-text-muted);
}

.input-label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: 500;
  color: var(--color-text);
}
```

### Cards

```tsx
// Dream Board Preview Card — with playful tilt
<Card variant="tilted" className="p-6">
  <Avatar src={childPhoto} size="xl" />
  <h2 className="font-display">{childName}'s Birthday</h2>
  <ProgressBar value={raised} max={goal} />
</Card>

// Product Card — clean, focused
<Card className="p-4">
  <img src={product.image} className="rounded-xl" />
  <h3 className="font-semibold mt-3">{product.name}</h3>
  <p className="text-primary font-bold text-lg">
    R{formatMoney(product.price)}
  </p>
</Card>
```

**Card Styles:**
```css
.card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-soft);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lifted);
}

/* Playful tilted card variant */
.card-tilted {
  position: relative;
}

.card-tilted::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-accent-light);
  border-radius: var(--radius-xl);
  transform: rotate(2deg);
  z-index: -1;
}

.card-tilted > .card-inner {
  background: white;
  border-radius: var(--radius-xl);
  transform: rotate(-1deg);
  transition: transform 0.2s ease;
}

.card-tilted:hover > .card-inner {
  transform: rotate(0deg);
}
```

### Progress Bar

```tsx
<ProgressBar
  value={125000}
  max={249900}
  showLabel
  formatValue={(v) => `R${formatMoney(v)}`}
/>
```

**Visual:**
```
━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░
50% funded
```

**Styles:**
```css
.progress-track {
  height: 12px;
  background: var(--color-bg-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%);
  border-radius: var(--radius-full);
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.progress-label {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
```

### Avatar

```css
.avatar {
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.avatar-sm { width: 32px; height: 32px; }
.avatar-md { width: 48px; height: 48px; }
.avatar-lg { width: 64px; height: 64px; }
.avatar-xl { width: 96px; height: 96px; }
.avatar-2xl { width: 128px; height: 128px; }
```

---

## Screen Specifications

### Landing Page

**URL:** `/`

**Layout:**
```
┌─────────────────────────────────────┐
│           [ChipIn Logo]             │
│                                     │
│    Turn 20 toys into one            │
│         dream gift                  │
│                                     │
│  Friends chip in together for       │
│  your child's birthday              │
│                                     │
│  ┌───────────────────────────────┐  │
│  │    Create a Dream Board →     │  │
│  └───────────────────────────────┘  │
│                                     │
│         How it works ↓              │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [Illustration: 4-step flow]        │
│                                     │
│  1. Create Board  2. Share Link     │
│  3. Friends Chip In  4. Dream Gift  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  "No more clutter. Just one         │
│   perfect gift."                    │
│                                     │
│  ⭐⭐⭐⭐⭐  "Game changer!"        │
│           — Sarah, Cape Town        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │    Create a Dream Board →     │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Dream Board Creation Wizard

**Step Indicators:**
```
[ 1 ]───────[ 2 ]───────[ 3 ]───────[ 4 ]
 ●           ○           ○           ○
Child      Gift       Details      Share
```

**Step 1: Child Details**
```
┌─────────────────────────────────────┐
│ ← Back          Step 1 of 4         │
│                                     │
│  Who's the birthday star? 🎂        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      📷 Add photo           │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Child's first name                 │
│  ┌─────────────────────────────────┐│
│  │ Maya                            ││
│  └─────────────────────────────────┘│
│                                     │
│  Birthday date                      │
│  ┌─────────────────────────────────┐│
│  │ 📅 15 February 2026             ││
│  └─────────────────────────────────┘│
│                                     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │        Continue →             │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Step 2: Gift Selection**
```
┌─────────────────────────────────────┐
│ ← Back          Step 2 of 4         │
│                                     │
│  What's Maya's dream gift? 🎁       │
│                                     │
│  ┌────────────────┬────────────────┐│
│  │   🛒 Product   │   💝 Gift of   ││
│  │               │    Giving      ││
│  └────────────────┴────────────────┘│
│                                     │
│  Search Takealot:                   │
│  ┌─────────────────────────────────┐│
│  │ 🔍 lego star wars               ││
│  └─────────────────────────────────┘│
│                                     │
│  Results:                           │
│  ┌─────────────────────────────────┐│
│  │ [img] LEGO Death Star           ││
│  │       R2,499.00          [✓]   ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [img] LEGO Millennium Falcon    ││
│  │       R1,899.00          [ ]   ││
│  └─────────────────────────────────┘│
│                                     │
│  ─── OR paste a link ───           │
│  ┌─────────────────────────────────┐│
│  │ https://takealot.com/...        ││
│  └─────────────────────────────────┘│
│                                     │
│  Charity after funded (required):   │
│  ┌─────────────────────────────────┐│
│  │ Feed Hungry Children            ││
│  │ Food Forward SA                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌───────────────────────────────┐  │
│  │        Continue →             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Step 3: Details**
```
┌─────────────────────────────────────┐
│ ← Back          Step 3 of 4         │
│                                     │
│  Almost done! ✨                    │
│                                     │
│  Where should we send the gift card?│
│  ┌─────────────────────────────────┐│
│  │ parent@example.com              ││
│  └─────────────────────────────────┘│
│  Payout method (Takealot gifts)      │
│  ┌─────────────────────────────────┐│
│  │ ○ Takealot Gift Card            ││
│  │ ● Fund my Karri Card            ││
│  └─────────────────────────────────┘│
│  (We'll confirm payout by email)    │
│                                     │
│  Add a message (optional)           │
│  ┌─────────────────────────────────┐│
│  │ Maya would love your            ││
│  │ contribution toward her dream   ││
│  │ Lego set!                       ││
│  └─────────────────────────────────┘│
│                                 42/280│
│                                     │
│  Contribution deadline              │
│  ┌─────────────────────────────────┐│
│  │ 📅 14 February 2026             ││
│  └─────────────────────────────────┘│
│  (One day before the birthday)      │
│                                     │
│  ┌───────────────────────────────┐  │
│  │     Review & Create →         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

If the gift type is philanthropy, the payout method is fixed to donation and this selection is hidden.

**Step 4: Review & Share**
```
┌─────────────────────────────────────┐
│ ← Back          Step 4 of 4         │
│                                     │
│  Review your Dream Board            │
│                                     │
│  ┌─────────────────────────────────┐│
│  │        [Maya's Photo]           ││
│  │                                 ││
│  │    Maya's 7th Birthday          ││
│  │                                 ││
│  │  ┌───────────────────────────┐  ││
│  │  │ [LEGO Death Star]         │  ││
│  │  │ Her dream gift            │  ││
│  │  │ Goal: R2,499              │  ││
│  │  └───────────────────────────┘  ││
│  │                                 ││
│  │  "Maya would love your          ││
│  │   contribution toward her       ││
│  │   dream Lego set!"              ││
│  │                                 ││
│  │  ⏰ Closes Feb 14               ││
│  └─────────────────────────────────┘│
│                                     │
│  [Edit Child] [Edit Gift] [Edit Msg]│
│                                     │
│  ┌───────────────────────────────┐  │
│  │    Create Dream Board →       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Share Screen (Post-Creation)

```
┌─────────────────────────────────────┐
│                                     │
│              🎉                     │
│                                     │
│  Your Dream Board is live!          │
│                                     │
│  Share this link with party guests: │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ chipin.co.za/maya-7th-x7k9m2   ││
│  │                         [📋]   ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌───────────────────────────────┐  │
│  │  📱 Share via WhatsApp        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  ✉️  Share via Email          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │     Go to Dashboard →         │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Guest View (Dream Board)

```
┌─────────────────────────────────────┐
│                                     │
│         ┌─────────────┐             │
│         │   [Photo]   │             │
│         │    Maya     │             │
│         └─────────────┘             │
│                                     │
│      Maya's 7th Birthday 🎂         │
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │   [LEGO Death Star Image]       ││
│  │                                 ││
│  │   LEGO Star Wars Death Star    ││
│  │   Her dream gift                ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░   │
│  50% funded                        │
│                                     │
│  "Maya would love your contribution │
│   toward her dream Lego set!"       │
│                                     │
│  ⏰ 5 days left                     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │     Contribute Now →          │  │
│  └───────────────────────────────┘  │
│                                     │
│  Contributors:                      │
│  Sarah • John • Lisa + 5 more       │
│                                     │
│  ─────────────────────────────────  │
│  Powered by ChipIn                  │
└─────────────────────────────────────┘
```

### Guest View (Charity Overflow)

Shown after gift goal is fully funded. Gift details are hidden.

```
┌─────────────────────────────────────┐
│                                     │
│            🎉 Gift funded           │
│                                     │
│  Maya chose to support:             │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ [Charity Logo]                  ││
│  │ Feed Hungry Children            ││
│  │ Food Forward SA                 ││
│  └─────────────────────────────────┘│
│                                     │
│  R350 raised so far (open-ended)    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Contribute to the charity → │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Contribution Flow

```
┌─────────────────────────────────────┐
│ ← Back                              │
│                                     │
│  Contribute to Maya's Dream Gift 🎁 │
│                                     │
│  Select an amount:                  │
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │  R100   │ │  R200   │ │  R500   ││
│  │         │ │   ✓     │ │         ││
│  └─────────┘ └─────────┘ └─────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Other: R _________              ││
│  └─────────────────────────────────┘│
│                                     │
│  Your name (shown to family):       │
│  ┌─────────────────────────────────┐│
│  │ Sarah                           ││
│  └─────────────────────────────────┘│
│                                     │
│  Message (optional):                │
│  ┌─────────────────────────────────┐│
│  │ Happy birthday Maya! 🎉         ││
│  └─────────────────────────────────┘│
│                                     │
│  ─────────────────────────────────  │
│  Contribution: R200                 │
│  ChipIn fee (3%): R6                │
│  Total: R206                        │
│  ─────────────────────────────────  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Continue to Payment →       │  │
│  └───────────────────────────────┘  │
│                                     │
│  🔒 Secure payment by trusted        │
│                                     │
└─────────────────────────────────────┘
```

### Thank You Screen

```
┌─────────────────────────────────────┐
│                                     │
│         🎉 🎊 🎉                    │
│                                     │
│      Thank you, Sarah!              │
│                                     │
│  Your R200 contribution brings      │
│  Maya closer to her dream gift!     │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░   │
│  58% funded                        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  📱 Share with friends        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │     View Dream Board          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Want to create your own?           │
│  ┌───────────────────────────────┐  │
│  │  Create a Dream Board →       │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Layout Adjustments

| Screen | Guest View | Host Dashboard |
|--------|------------|----------------|
| Mobile (<640px) | Single column, stacked | Single column |
| Tablet (640-1024px) | Centered card, max-w-md | Two-column grid |
| Desktop (>1024px) | Centered card, max-w-lg | Sidebar + main |

---

## Animations & Micro-interactions

### Page Transitions

```css
/* Fade in on mount */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-enter {
  animation: fadeIn 200ms ease-out;
}
```

### Progress Bar Animation

```css
.progress-bar-fill {
  transition: width 500ms ease-out;
}
```

### Confetti on Goal Reached

Use `canvas-confetti` library:
```tsx
import confetti from 'canvas-confetti';

function celebrateGoal() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}
```

### Button Feedback

```css
.btn:active {
  transform: scale(0.98);
}

.btn:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

---

## Accessibility Checklist

- [ ] All images have alt text
- [ ] Form inputs have associated labels
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Motion respects `prefers-reduced-motion`
- [ ] Touch targets ≥44x44px

---

## Document References

| Document | Purpose |
|----------|---------|
| [JOURNEYS.md](./JOURNEYS.md) | User flow logic |
| [SPEC.md](./SPEC.md) | Product requirements |
