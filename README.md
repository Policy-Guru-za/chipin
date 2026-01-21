# ChipIn Technical Documentation

> **Version:** 1.0.0  
> **Last Updated:** January 2026  
> **Status:** Ready for Development

---

## Quick Start for AI Coding Agents

**Read [`AGENTS.md`](./AGENTS.md) first.** It contains:
- Build order and phased implementation
- Code standards and patterns
- Key implementation details
- File structure requirements
- Frontend aesthetics guidelines (NO "AI slop")

---

## What We're Building

**ChipIn** is a social gifting platform where:
1. Parent creates a "Dream Board" with ONE gift item from Takealot
2. Shares link with party guests via WhatsApp
3. Guests contribute money toward the gift
4. When pot closes, funds convert to a Takealot gift card

**Tagline:** *Friends chip in together to turn birthday clutter into one dream gift.*

---

## Documentation Index

### Core Documents

| Document | Description | Read When |
|----------|-------------|-----------|
| [`docs/Platform-Spec-Docs/CANONICAL.md`](./docs/Platform-Spec-Docs/CANONICAL.md) | Source of truth (resolves conflicts) | **Read first after AGENTS** |
| [`docs/Platform-Spec-Docs/SPEC.md`](./docs/Platform-Spec-Docs/SPEC.md) | Product requirements, features, non-features | Understanding what to build |
| [`docs/Platform-Spec-Docs/ARCHITECTURE.md`](./docs/Platform-Spec-Docs/ARCHITECTURE.md) | System design, tech stack, deployment | Planning infrastructure |
| [`docs/Platform-Spec-Docs/JOURNEYS.md`](./docs/Platform-Spec-Docs/JOURNEYS.md) | User flows with screen mockups | Building UI flows |
| [`docs/Platform-Spec-Docs/DATA.md`](./docs/Platform-Spec-Docs/DATA.md) | Database schema, Drizzle models | Setting up database |
| [`docs/Platform-Spec-Docs/API.md`](./docs/Platform-Spec-Docs/API.md) | Public API specification | Building API endpoints |
| [`docs/Platform-Spec-Docs/PAYMENTS.md`](./docs/Platform-Spec-Docs/PAYMENTS.md) | Payment provider integration | Integrating PayFast/Ozow/SnapScan |
| [`docs/Platform-Spec-Docs/INTEGRATIONS.md`](./docs/Platform-Spec-Docs/INTEGRATIONS.md) | Third-party services overview | External integrations |
| [`docs/Platform-Spec-Docs/UX.md`](./docs/Platform-Spec-Docs/UX.md) | Design system, components, screens | Building UI |
| [`docs/Platform-Spec-Docs/SECURITY.md`](./docs/Platform-Spec-Docs/SECURITY.md) | Security & POPIA requirements | Security implementation |
| [`AGENTS.md`](./AGENTS.md) | AI coding agent instructions | **READ FIRST** |

### Integration Specs

| Document | Status | Description |
|----------|--------|-------------|
| [`docs/Platform-Spec-Docs/TAKEALOT.md`](./docs/Platform-Spec-Docs/TAKEALOT.md) | P0 - MVP | Product data + gift card payout |
| [`docs/Platform-Spec-Docs/PHILANTHROPY.md`](./docs/Platform-Spec-Docs/PHILANTHROPY.md) | P1 - Post-MVP | Charitable giving option |
| [`docs/Platform-Spec-Docs/KARRI.md`](./docs/Platform-Spec-Docs/KARRI.md) | P1 - Optional | Karri Card payout |

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| Database | Neon (PostgreSQL) |
| ORM | Drizzle |
| Styling | Tailwind CSS (customized) |
| Components | shadcn/ui (customized) |
| Hosting | Vercel |
| Payments | PayFast, Ozow, SnapScan |
| Email | Resend |
| Storage | Vercel Blob |
| Cache | Vercel KV |

---

## MVP Scope

### In Scope
- ✅ Dream Board creation with Takealot URL
- ✅ Magic link authentication
- ✅ Guest contribution via PayFast
- ✅ Optional payout method: Fund my Karri Card
- ✅ Charity overflow selection (used when gift is fully funded)
- ✅ Progress tracking
- ✅ Email notifications
- ✅ Takealot gift card or Karri top-up payout (manual process OK)

### Out of Scope (Post-MVP)
- ❌ Ozow / SnapScan (feature-flagged; can ship after PayFast)
- ❌ Primary philanthropy-only Dream Boards (charity overflow is in-scope)
- ❌ Karri Card API automation (manual top-up OK for MVP)
- ❌ Partner API program
- ❌ Native mobile apps

---

## Key Design Decisions

1. **One gift, not a registry** — Simplicity over flexibility
2. **Mobile web, not native app** — Zero download friction for guests
3. **Takealot-first** — Karri is optional, not a dependency
4. **We expose APIs** — Partners integrate with us, not reverse
5. **Manual payout OK for MVP** — Automation can come later
6. **No "AI slop" UI** — Distinctive, opinionated design

---

## Getting Started

```bash
# 1. Clone and install
git clone <repo>
cd chipin
pnpm install

# 2. Set up environment
cp .env.example .env.local
# Fill in environment variables

# 3. Set up database
pnpm drizzle-kit generate:pg
pnpm drizzle-kit push:pg

# 4. Run development server
pnpm dev
```

---

## Questions?

If requirements are unclear:
1. Check the specific document
2. Follow the principle of simplicity
3. When in doubt, implement the minimal version

**Goal:** Working MVP, not perfect system. Ship, then iterate.
