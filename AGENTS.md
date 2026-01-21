# ChipIn: AI Coding Agent Instructions

> **Purpose:** This document provides comprehensive instructions for AI coding agents (Codex, Claude, etc.) to build the ChipIn platform.
> 
> **Read First:** Before writing any code, read ALL documentation files in this `/docs` folder. The specifications are detailed and must be followed precisely.

---

## Quick Reference

### What We're Building
A mobile-web-first gift pooling platform where party hosts create a "Dream Board" with ONE gift item, share a link with guests, guests contribute money, and when the pot closes, funds convert to a Takealot gift card or a Karri Card top-up. If the gift is fully funded early, guests see a charity overflow view instead of the gift. Philanthropy-only Dream Boards (primary charity goal) are in scope by default.

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Database | Neon (PostgreSQL) |
| ORM | Drizzle |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Hosting | Vercel |
| Email | Resend |
| Payments | PayFast (primary), Ozow, SnapScan |
| Storage | Vercel Blob (images) |
| Cache | Vercel KV (Redis) |

### Core Documents
| Document | What It Contains |
|----------|------------------|
| `CANONICAL.md` | Source of truth (resolves conflicts) |
| `SPEC.md` | Product requirements, features, non-features |
| `ARCHITECTURE.md` | System design, project structure, deployment |
| `JOURNEYS.md` | Step-by-step user flows with screen mockups |
| `DATA.md` | Database schema, entity relationships |
| `API.md` | Public API specification for partners |
| `PAYMENTS.md` | Payment provider integration details |
| `INTEGRATIONS.md` | Takealot, email, storage integrations |
| `UX.md` | Design system, components, screen specs |
| `SECURITY.md` | Security requirements, POPIA compliance |
| `NFR-OPERATIONS.md` | Non-functional requirements, operations |

If any documents conflict, `CANONICAL.md` wins.

---

## Build Order
Use `docs/implementation-docs/CHIPIN-IMPLEMENTATION-PLAN.md` as the single source of truth for phases, gates, and acceptance criteria. No deferrals.

---

## Code Standards

### TypeScript

**Strict mode required:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Use explicit types:**
```typescript
// ✅ Good
function calculateFee(amountCents: number): number {
  return Math.round(amountCents * 0.03);
}

// ❌ Bad
function calculateFee(amount) {
  return Math.round(amount * 0.03);
}
```

**Use Zod for validation:**
```typescript
import { z } from 'zod';

export const createDreamBoardSchema = z.object({
  childName: z.string().min(2).max(50),
  childPhotoUrl: z.string().url(),
  birthdayDate: z.coerce.date(),
  giftType: z.enum(['takealot_product', 'philanthropy']),
  giftData: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('takealot_product'),
      productUrl: z.string().url(),
      productName: z.string().min(2),
      productImage: z.string().url(),
      productPrice: z.number().int().positive(),
    }),
    z.object({
      type: z.literal('philanthropy'),
      causeId: z.string(),
      causeName: z.string(),
      impactDescription: z.string(),
      amountCents: z.number().int().positive(),
    }),
  ]),
  goalCents: z.number().int().positive(),
  payoutMethod: z.enum(['takealot_gift_card', 'karri_card_topup', 'philanthropy_donation']),
  overflowGiftData: z.object({
    causeId: z.string(),
    causeName: z.string(),
    impactDescription: z.string(),
  }).optional(),
  deadline: z.coerce.date(),
  payoutEmail: z.string().email(),
  message: z.string().max(280).optional(),
}).superRefine((val, ctx) => {
  if (val.giftType === 'takealot_product' && !val.overflowGiftData) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['overflowGiftData'],
      message: 'Required when giftType is takealot_product',
    });
  }
  if (val.giftType === 'philanthropy' && val.payoutMethod !== 'philanthropy_donation') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['payoutMethod'],
      message: 'Must be philanthropy_donation for philanthropy gifts',
    });
  }
});

export type CreateDreamBoardInput = z.infer<typeof createDreamBoardSchema>;
```

### React Components

**Use Server Components by default:**
```typescript
// app/[slug]/page.tsx - Server Component (default)
export default async function DreamBoardPage({ params }: { params: { slug: string } }) {
  const dreamBoard = await getDreamBoard(params.slug);
  return <DreamBoardView dreamBoard={dreamBoard} />;
}
```

**Use Client Components only when needed:**
```typescript
// components/ContributionForm.tsx
'use client';

import { useState } from 'react';

export function ContributionForm({ dreamBoardId }: { dreamBoardId: string }) {
  const [amount, setAmount] = useState<number | null>(null);
  // ... interactive logic
}
```

### API Routes

**Use Route Handlers (App Router):**
```typescript
// app/api/dream-boards/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createDreamBoardSchema.parse(body);
    
    const dreamBoard = await createDreamBoard(input);
    
    return NextResponse.json({ data: dreamBoard }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'validation_error', details: error.errors } },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

### Database

**Use Drizzle ORM:**
```typescript
// lib/db/schema.ts
import { pgTable, uuid, varchar, integer, timestamp, text, jsonb, date, pgEnum } from 'drizzle-orm/pg-core';

export const dreamBoardStatusEnum = pgEnum('dream_board_status', [
  'draft', 'active', 'funded', 'closed', 'paid_out', 'expired', 'cancelled'
]);

export const giftTypeEnum = pgEnum('gift_type', [
  'takealot_product', 'philanthropy'
]);

export const payoutMethodEnum = pgEnum('payout_method', [
  'takealot_gift_card', 'karri_card_topup', 'philanthropy_donation'
]);

export const dreamBoards = pgTable('dream_boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  hostId: uuid('host_id').notNull().references(() => hosts.id),
  childName: varchar('child_name', { length: 50 }).notNull(),
  childPhotoUrl: text('child_photo_url').notNull(),
  birthdayDate: date('birthday_date').notNull(),
  giftType: giftTypeEnum('gift_type').notNull(),
  giftData: jsonb('gift_data').notNull(),
  goalCents: integer('goal_cents').notNull(),
  payoutMethod: payoutMethodEnum('payout_method').notNull(),
  overflowGiftData: jsonb('overflow_gift_data'),
  message: text('message'),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  status: dreamBoardStatusEnum('status').notNull().default('draft'),
  payoutEmail: varchar('payout_email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Query patterns:**
```typescript
// lib/db/queries.ts
import { db } from './index';
import { dreamBoards, contributions } from './schema';
import { eq, and, sql } from 'drizzle-orm';

export async function getDreamBoardBySlug(slug: string) {
  const result = await db
    .select({
      ...dreamBoards,
      raisedCents: sql<number>`COALESCE(SUM(${contributions.netCents}), 0)`.as('raised_cents'),
      contributionCount: sql<number>`COUNT(${contributions.id})`.as('contribution_count'),
    })
    .from(dreamBoards)
    .leftJoin(contributions, and(
      eq(contributions.dreamBoardId, dreamBoards.id),
      eq(contributions.paymentStatus, 'completed')
    ))
    .where(eq(dreamBoards.slug, slug))
    .groupBy(dreamBoards.id)
    .limit(1);
  
  return result[0] || null;
}
```

---

## Key Implementation Details

### 1. Slug Generation

Generate human-readable, unique slugs:

```typescript
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

export function generateSlug(childName: string): string {
  const sanitized = childName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${sanitized}-birthday-${nanoid()}`;
}

// Output: "maya-birthday-x7k9m2"
```

### 2. Takealot URL Parsing

Extract product details from URL:

```typescript
// lib/integrations/takealot.ts

export interface TakealotProduct {
  url: string;
  name: string;
  priceCents: number;
  imageUrl: string;
}

export async function fetchTakealotProduct(url: string): Promise<TakealotProduct> {
  // Validate URL
  if (!url.includes('takealot.com')) {
    throw new Error('Invalid Takealot URL');
  }

  // Fetch the page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ChipIn/1.0 (+https://chipin.co.za)',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }

  const html = await response.text();

  // Extract JSON-LD structured data (preferred)
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    if (jsonLd['@type'] === 'Product') {
      return {
        url,
        name: jsonLd.name,
        priceCents: Math.round(parseFloat(jsonLd.offers?.price || 0) * 100),
        imageUrl: jsonLd.image,
      };
    }
  }

  // Fallback to Open Graph tags
  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const priceMatch = html.match(/R\s*([\d,]+(?:\.\d{2})?)/);
  
  if (!ogTitle || !priceMatch) {
    throw new Error('Could not extract product details');
  }

  return {
    url,
    name: ogTitle.replace(' | Takealot.com', ''),
    priceCents: Math.round(parseFloat(priceMatch[1].replace(',', '')) * 100),
    imageUrl: ogImage || '',
  };
}
```

### 3. PayFast Integration

**Create payment:**
```typescript
// lib/payments/payfast.ts
import crypto from 'crypto';

const PAYFAST_URL = process.env.PAYFAST_SANDBOX === 'true'
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process';

export interface PayFastPaymentParams {
  amountCents: number;
  reference: string;
  itemName: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export function createPayFastPayment(params: PayFastPaymentParams): string {
  const encodePayfast = (value: string) =>
    encodeURIComponent(value)
      .replace(/%20/g, '+')
      .replace(/%[0-9a-f]{2}/gi, match => match.toUpperCase());

  const ordered: Array<[string, string]> = [
    ['merchant_id', process.env.PAYFAST_MERCHANT_ID!],
    ['merchant_key', process.env.PAYFAST_MERCHANT_KEY!],
    ['return_url', params.returnUrl],
    ['cancel_url', params.cancelUrl],
    ['notify_url', params.notifyUrl],
    ['m_payment_id', params.reference],
    ['amount', (params.amountCents / 100).toFixed(2)],
    ['item_name', params.itemName],
  ];

  const paramString = ordered
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${key}=${encodePayfast(value)}`)
    .join('&');

  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const signatureString = passphrase
    ? `${paramString}&passphrase=${encodePayfast(passphrase)}`
    : paramString;
  const signature = crypto.createHash('md5').update(signatureString).digest('hex');

  // Build redirect URL
  const queryString = new URLSearchParams({
    ...Object.fromEntries(ordered),
    signature,
  }).toString();
  return `${PAYFAST_URL}?${queryString}`;
}
```

**Verify webhook:**
```typescript
// app/api/webhooks/payfast/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const pairs = rawBody.split('&').filter(Boolean);
  const payload: Record<string, string> = {};
  const beforeSignature: string[] = [];
  let signature = '';

  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.split('=');
    if (rawKey === 'signature') {
      signature = decodeURIComponent(rest.join('=').replace(/\+/g, '%20'));
      break;
    }
    beforeSignature.push(pair);
    payload[decodeURIComponent(rawKey)] = decodeURIComponent(rest.join('=').replace(/\+/g, '%20'));
  }

  const encodePayfast = (value: string) =>
    encodeURIComponent(value)
      .replace(/%20/g, '+')
      .replace(/%[0-9a-f]{2}/gi, match => match.toUpperCase());

  const paramString = beforeSignature.join('&');
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const signatureString = passphrase
    ? `${paramString}&passphrase=${encodePayfast(passphrase)}`
    : paramString;
  const expectedSignature = crypto.createHash('md5').update(signatureString).digest('hex');

  if (!signature || signature !== expectedSignature) {
    console.error('PayFast signature mismatch');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Process the payment
  const paymentRef = payload.m_payment_id;
  const status = payload.payment_status;

  if (status === 'COMPLETE') {
    await updateContributionStatus(paymentRef, 'completed');
    await updateDreamBoardTotals(paymentRef);
    await sendContributionNotification(paymentRef);
  } else if (status === 'FAILED' || status === 'CANCELLED') {
    await updateContributionStatus(paymentRef, 'failed');
  }

  return NextResponse.json({ received: true });
}
```

### 4. Magic Link Authentication

```typescript
// lib/auth/magic-link.ts
import { randomBytes, createHash } from 'crypto';
import { kv } from '@vercel/kv';
import { sendEmail } from '@/lib/email';

const MAGIC_LINK_EXPIRY = 60 * 60; // 1 hour

export async function sendMagicLink(email: string): Promise<void> {
  // Generate token
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  // Store hash with expiry
  await kv.set(`magic:${tokenHash}`, email, { ex: MAGIC_LINK_EXPIRY });

  // Send email
  const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: 'Your ChipIn magic link ✨',
    html: `
      <h1>Welcome to ChipIn!</h1>
      <p>Click below to continue:</p>
      <a href="${magicLink}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:white;text-decoration:none;border-radius:8px;">
        Continue to ChipIn →
      </a>
      <p>This link expires in 1 hour.</p>
    `,
  });
}

export async function verifyMagicLink(token: string): Promise<string | null> {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const email = await kv.get<string>(`magic:${tokenHash}`);
  
  if (!email) {
    return null;
  }

  // Invalidate token (single use)
  await kv.del(`magic:${tokenHash}`);
  
  return email;
}
```

### 5. Session Management

```typescript
// lib/auth/session.ts
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { randomBytes } from 'crypto';

const SESSION_EXPIRY = 60 * 60 * 24 * 7; // 7 days

interface Session {
  id: string;
  hostId: string;
  email: string;
  createdAt: number;
}

export async function createSession(hostId: string, email: string): Promise<void> {
  const sessionId = randomBytes(32).toString('hex');
  
  const session: Session = {
    id: sessionId,
    hostId,
    email,
    createdAt: Date.now(),
  };

  await kv.set(`session:${sessionId}`, session, { ex: SESSION_EXPIRY });

  cookies().set('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY,
    path: '/',
  });
}

export async function getSession(): Promise<Session | null> {
  const sessionId = cookies().get('session')?.value;
  if (!sessionId) return null;

  const session = await kv.get<Session>(`session:${sessionId}`);
  return session;
}

export async function deleteSession(): Promise<void> {
  const sessionId = cookies().get('session')?.value;
  if (sessionId) {
    await kv.del(`session:${sessionId}`);
  }
  cookies().delete('session');
}
```

---

## File Structure

Create this exact structure:

```
chipin/
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── page.tsx                 # Landing page
│   │   │   └── layout.tsx
│   │   ├── (host)/
│   │   │   ├── create/
│   │   │   │   ├── page.tsx             # Wizard entry
│   │   │   │   ├── child/page.tsx       # Step 1: Child details
│   │   │   │   ├── gift/page.tsx        # Step 2: Gift selection
│   │   │   │   ├── details/page.tsx     # Step 3: Payout details
│   │   │   │   └── review/page.tsx      # Step 4: Review & create
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx             # Dashboard home
│   │   │   │   └── [id]/page.tsx        # Individual board management
│   │   │   └── layout.tsx               # Auth wrapper
│   │   ├── (guest)/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx             # Dream Board view
│   │   │       ├── contribute/page.tsx  # Contribution flow
│   │   │       └── thanks/page.tsx      # Thank you page
│   │   ├── auth/
│   │   │   ├── login/page.tsx           # Email input
│   │   │   ├── verify/page.tsx          # Magic link verify
│   │   │   └── logout/route.ts          # Logout action
│   │   ├── api/
│   │   │   ├── v1/                      # Public API (versioned)
│   │   │   │   ├── dream-boards/
│   │   │   │   ├── contributions/
│   │   │   │   └── payouts/
│   │   │   ├── internal/                # Internal API
│   │   │   │   ├── auth/
│   │   │   │   ├── upload/
│   │   │   │   └── products/
│   │   │   └── webhooks/
│   │   │       ├── payfast/route.ts
│   │   │       ├── ozow/route.ts
│   │   │       └── snapscan/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                          # shadcn/ui components
│   │   ├── dream-board/
│   │   │   ├── DreamBoardCard.tsx
│   │   │   ├── DreamBoardView.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── ContributorList.tsx
│   │   ├── forms/
│   │   │   ├── ChildDetailsForm.tsx
│   │   │   ├── GiftSelectionForm.tsx
│   │   │   ├── PayoutDetailsForm.tsx
│   │   │   └── ContributionForm.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── MobileNav.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                 # Drizzle client
│   │   │   ├── schema.ts                # All table definitions
│   │   │   └── queries.ts               # Common queries
│   │   ├── auth/
│   │   │   ├── magic-link.ts
│   │   │   └── session.ts
│   │   ├── payments/
│   │   │   ├── index.ts                 # Provider abstraction
│   │   │   ├── payfast.ts
│   │   │   ├── ozow.ts
│   │   │   └── snapscan.ts
│   │   ├── integrations/
│   │   │   ├── takealot.ts
│   │   │   └── email.ts
│   │   ├── utils/
│   │   │   ├── slug.ts
│   │   │   ├── money.ts
│   │   │   └── date.ts
│   │   └── constants.ts
│   ├── hooks/
│   │   ├── useSession.ts
│   │   └── useDreamBoard.ts
│   └── types/
│       └── index.ts
├── public/
│   └── images/
├── docs/                                # This documentation
├── drizzle/
│   └── migrations/
├── drizzle.config.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Environment Variables

Create `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
SESSION_SECRET="generate-a-random-32-byte-string"

# PayFast
PAYFAST_MERCHANT_ID=""
PAYFAST_MERCHANT_KEY=""
PAYFAST_PASSPHRASE=""
PAYFAST_SANDBOX="true"

# Ozow
OZOW_CLIENT_ID=""
OZOW_CLIENT_SECRET=""
OZOW_SITE_CODE=""
OZOW_BASE_URL="https://stagingone.ozow.com/v1"
OZOW_WEBHOOK_SECRET=""

# SnapScan (Phase 2)
SNAPSCAN_MERCHANT_ID=""
SNAPSCAN_API_KEY=""

# Email
RESEND_API_KEY=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Testing Requirements

### Unit Tests
- Slug generation
- Fee calculation
- Takealot URL parsing
- Signature verification

### Integration Tests
- Database operations
- API endpoints
- Webhook handling

### E2E Tests (Playwright)
- Complete host flow
- Complete guest flow
- Payment flow (sandbox)

---

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel
- [ ] Database migrations applied
- [ ] PayFast production credentials
- [ ] Domain configured (chipin.co.za)
- [ ] SSL verified
- [ ] Error tracking enabled
- [ ] Webhooks configured in PayFast dashboard
- [ ] Email sending verified
- [ ] Mobile responsiveness tested
- [ ] Performance benchmarked (<2s page load)

---

## Frontend Aesthetics: No "AI Slop"

ChipIn must look **distinctive and opinionated**, not like generic AI-generated UI. This is a celebration platform — it should feel joyful, not corporate.

### Typography

**DO:** Use a real, distinctive font pairing.

```css
/* Primary: Outfit (geometric, friendly, modern) */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

/* Accent: Fraunces (playful serif for headlines) */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');

:root {
  --font-primary: 'Outfit', system-ui, sans-serif;
  --font-display: 'Fraunces', Georgia, serif;
}

/* Headlines use display font */
h1, h2, .display { font-family: var(--font-display); }

/* Everything else uses primary */
body { font-family: var(--font-primary); }
```

**DON'T:** Use Inter, Roboto, system-ui defaults, or generic sans-serifs.

### Color Palette

**DO:** Commit to a bold, custom palette. No default Tailwind colors.

```css
:root {
  /* Primary: Warm teal (not generic teal-500) */
  --color-primary: #0D9488;
  --color-primary-light: #5EEAD4;
  --color-primary-dark: #134E4A;
  
  /* Accent: Sunset coral (warmth, celebration) */
  --color-accent: #F97316;
  --color-accent-light: #FDBA74;
  
  /* Background: Warm cream, not pure white */
  --color-bg: #FEFDFB;
  --color-bg-subtle: #FDF8F3;
  
  /* Text: Warm charcoal, not pure black */
  --color-text: #1C1917;
  --color-text-muted: #78716C;
  
  /* Surfaces: Warm grays */
  --color-surface: #FAFAF9;
  --color-border: #E7E5E4;
}
```

**DON'T:** 
- Purple-on-white clichés
- Default Tailwind gray-50, gray-100, etc.
- Pure white (#FFFFFF) backgrounds
- Pure black (#000000) text

### Layout & Composition

**DO:**
- Asymmetric layouts where appropriate
- Generous whitespace with intentional density shifts
- Cards with personality (rounded corners, subtle rotation, depth)
- Full-bleed hero sections on landing

**DON'T:**
- Generic 3-column grids
- Predictable card layouts
- Everything centered and symmetrical
- Cramped, equal spacing everywhere

### Depth & Texture

**DO:** Add visual depth to backgrounds.

```css
/* Gradient backgrounds with warmth */
.hero-bg {
  background: 
    radial-gradient(ellipse at top right, rgba(94, 234, 212, 0.15), transparent 50%),
    radial-gradient(ellipse at bottom left, rgba(249, 115, 22, 0.1), transparent 50%),
    var(--color-bg);
}

/* Subtle noise texture */
.textured {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-blend-mode: soft-light;
  opacity: 0.03;
}

/* Cards with subtle lift */
.card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 
    0 1px 2px rgba(0,0,0,0.04),
    0 4px 12px rgba(0,0,0,0.04);
}

.card:hover {
  box-shadow: 
    0 4px 8px rgba(0,0,0,0.04),
    0 12px 24px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}
```

**DON'T:**
- Flat, single-color backgrounds
- Excessive blur effects (backdrop-blur everywhere)
- Heavy drop shadows
- Neumorphism

### Motion & Animation

**DO:** 1-2 high-impact moments, not random micro-animations.

```css
/* Page entrance: staggered reveal */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stagger-1 { animation: fadeUp 0.5s ease-out 0.1s both; }
.stagger-2 { animation: fadeUp 0.5s ease-out 0.2s both; }
.stagger-3 { animation: fadeUp 0.5s ease-out 0.3s both; }

/* High-impact moment: confetti on goal reached */
/* Use canvas-confetti library for celebration */

/* Progress bar: smooth, satisfying fill */
.progress-fill {
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**DON'T:**
- Random hover animations on everything
- Bouncing icons
- Infinite loading spinners where progress bars work
- Parallax scrolling (mobile nightmare)

### Component Personality

**DO:** Give components distinctive character.

```tsx
// Dream Board card with playful tilt
<div className="relative">
  <div className="absolute inset-0 bg-accent/20 rounded-2xl rotate-2" />
  <div className="relative bg-white rounded-2xl p-6 -rotate-1 hover:rotate-0 transition-transform">
    {/* Content */}
  </div>
</div>

// Progress bar with celebration colors
<div className="h-3 bg-stone-100 rounded-full overflow-hidden">
  <div 
    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
    style={{ width: `${percentage}%` }}
  />
</div>

// Amount selection buttons with tactile feel
<button className="
  px-6 py-3 rounded-xl font-semibold
  bg-stone-100 text-stone-700
  hover:bg-primary hover:text-white
  active:scale-95
  transition-all duration-150
">
  R200
</button>
```

### Real Examples

**Landing Hero — DO:**
```
┌─────────────────────────────────────────────────────┐
│ [warm gradient bg with subtle radial highlights]    │
│                                                     │
│     Turn 20 toys into                              │
│       one dream gift                               │  ← Display font, large
│                                                     │
│   Friends chip in together for your                │  ← Primary font, muted
│   child's birthday                                 │
│                                                     │
│   ┌─────────────────────────────┐                  │
│   │  Create a Dream Board  →    │  ← Bold accent  │
│   └─────────────────────────────┘                  │
│                                                     │
│   [Illustration: playful, hand-drawn style,        │
│    NOT generic 3D renders or stock vectors]        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Landing Hero — DON'T:**
```
┌─────────────────────────────────────────────────────┐
│ [flat white background]                             │
│                                                     │
│   Welcome to ChipIn                                │  ← Generic heading
│                                                     │
│   The #1 platform for birthday gift pooling        │  ← Marketing speak
│                                                     │
│   [Get Started]  [Learn More]                      │  ← Two equal buttons
│                                                     │
│   [3D illustration from undraw.co]                 │  ← AI slop indicator
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tailwind Config

Extend Tailwind with custom values, don't use defaults:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Custom palette, NOT default Tailwind
        primary: {
          DEFAULT: '#0D9488',
          light: '#5EEAD4',
          dark: '#134E4A',
        },
        accent: {
          DEFAULT: '#F97316',
          light: '#FDBA74',
        },
        surface: '#FEFDFB',
        subtle: '#FDF8F3',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        'lifted': '0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Common Mistakes to Avoid

1. **Don't use `'use client'` everywhere** — Server Components are the default and preferred
2. **Don't store payment data** — Use hosted payment pages only
3. **Don't forget webhook signature verification** — Security critical
4. **Don't hardcode URLs** — Use environment variables
5. **Don't skip validation** — Validate all inputs with Zod
6. **Don't forget mobile** — Test on real phones, not just DevTools
7. **Don't forget loading states** — Every async operation needs feedback
8. **Don't expose internal IDs** — Use slugs in URLs

---

## Questions?

If requirements are unclear:
1. Check the specific document (SPEC, JOURNEYS, etc.)
2. Follow the principle of simplicity
3. When in doubt, implement the minimal version

Goal: Enterprise-grade, full-scope delivery per implementation plan. No deferrals.
