# ChipIn Implementation Plan (0 → 1)

> Version: 1.0.0
> Last Updated: January 21, 2026
> Status: Active

## Purpose

Enterprise-grade build plan for ChipIn. No MVP deferrals. Every feature in specs is scheduled and shipped.
This is the main tracking document for phase-by-phase execution.

## How To Use

- Treat each phase as a gate. Do not start the next phase until exit criteria pass.
- Keep work items small and reviewable.
- Update this plan with status notes as phases complete.

## Source Documents (Required Reading)

- `docs/Platform-Spec-Docs/CANONICAL.md`
- `docs/Platform-Spec-Docs/SPEC.md`
- `docs/Platform-Spec-Docs/ARCHITECTURE.md`
- `docs/Platform-Spec-Docs/JOURNEYS.md`
- `docs/Platform-Spec-Docs/UX.md`
- `docs/Platform-Spec-Docs/DATA.md`
- `docs/Platform-Spec-Docs/API.md`
- `docs/Platform-Spec-Docs/PAYMENTS.md`
- `docs/Platform-Spec-Docs/INTEGRATIONS.md`
- `docs/Platform-Spec-Docs/TAKEALOT.md`
- `docs/Platform-Spec-Docs/KARRI.md`
- `docs/Platform-Spec-Docs/PHILANTHROPY.md`
- `docs/Platform-Spec-Docs/SECURITY.md`
- `docs/Platform-Spec-Docs/NFR-OPERATIONS.md`
- `docs/payment-docs/*`
- `AGENTS.md`

## Global Standards

- Package manager: pnpm only.
- TypeScript strict mode; no implicit any.
- Server Components by default; client components only when necessary.
- Zod for all input validation.
- Idempotency for all webhooks and payment creation endpoints.
- No raw card data handling. Hosted payment pages only.
- Feature flags for payment providers and high-risk flows.

## Phase Map (9 Phases)

0) Program Setup + Infra + Observability
1) Core App Foundation (Next.js + DB + UI system)
2) Auth + Session + Host Accounts
3) Host Flow (Dream Board creation, Takealot parsing, uploads)
4) Guest Flow (public view, contributions, charity overflow)
5) Payments (PayFast, Ozow One API, SnapScan) + Reconciliation
6) Payouts + Admin Console + Audit Logs
7) Integrations Deepening (Takealot/Karri/Philanthropy automation)
8) Public API + Enterprise Hardening + Launch

---

## Phase 0 — Program Setup + Infra + Observability

**Goal:** Production-grade foundations, CI/CD, ops tooling, and NFR baselines.

**Scope**
- Repository setup and project scaffolding.
- Environments: dev/staging/prod.
- Observability stack: Vercel logs + Sentry + OpenTelemetry + uptime checks.
- Operational runbooks and incident response.

**Tasks**
- Initialize Next.js 14 App Router app with TypeScript strict mode.
- Configure pnpm workspace, linting, formatting, and CI gates.
- Set up Vercel projects (dev/staging/prod) with env separation.
- Add Sentry (frontend + backend) and OpenTelemetry tracing baseline.
- Add uptime checks for guest view, contribution creation, and webhooks.
- Establish logging format and request correlation IDs.
- Create runbooks for payment provider outages and webhook failures.

**Acceptance Criteria**
- CI passes: lint, typecheck, unit tests.
- Deploy previews working in Vercel.
- Observability visible in dashboards (errors + traces).
- NFR targets tracked in `docs/Platform-Spec-Docs/NFR-OPERATIONS.md`.

**Verification Commands**
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

---

## Phase 1 — Core App Foundation

**Goal:** Core platform skeleton, database, and UI system.

**Scope**
- Drizzle + Neon configured.
- Base app routes, layouts, and design system.
- Shadcn/ui setup with custom theme from UX spec.

**Tasks**
- Create folder structure per `ARCHITECTURE.md`.
- Implement Drizzle schema per `DATA.md`.
- Add migrations and seed scripts.
- Configure Tailwind with custom palette + fonts (Outfit/Fraunces).
- Build base layout, header/footer, routing groups.
- Add shared UI primitives (buttons, cards, inputs) aligned to UX.

**Acceptance Criteria**
- Database migrates cleanly in dev and staging.
- Base layout renders with custom typography + palette.
- No unused routes or placeholder content.

**Verification Commands**
- `pnpm drizzle:generate`
- `pnpm drizzle:migrate`

---

## Phase 2 — Auth + Session + Host Accounts

**Goal:** Secure host authentication and session handling.

**Scope**
- Magic link auth flow.
- Session storage in Vercel KV.
- Host account creation and management.

**Tasks**
- Implement magic link issuance + verification (KV storage).
- Session creation, validation, logout.
- Host data model and minimal profile.
- Auth-protected `(host)` routes.
- Email templates via Resend.

**Acceptance Criteria**
- Magic link login works end-to-end in staging.
- Sessions expire correctly and are invalidated on logout.
- Audit trail for auth events.

**Verification Commands**
- `pnpm test auth`

---

## Phase 3 — Host Flow (Dream Board Creation)

**Goal:** Full Dream Board creation wizard and host dashboard.

**Scope**
- 4-step wizard per `JOURNEYS.md`.
- Takealot URL parsing and product data ingestion.
- Image upload to Vercel Blob.
- Charity overflow selection.

**Tasks**
- Build wizard routes and forms (child, gift, payout, review).
- Implement Takealot parsing + validation.
- Implement image upload pipeline + CDN URLs.
- Create Dream Board slug generation.
- Store gift + overflow charity data.
- Host dashboard: list, status, stats, manage board.

**Acceptance Criteria**
- Host can create a Dream Board end-to-end.
- Gift data + image stored correctly.
- Overflow charity required for Takealot gifts.

**Verification Commands**
- `pnpm test takealot`
- `pnpm test slug`

---

## Phase 4 — Guest Flow (Public View + Contributions UI)

**Goal:** Guest viewing and contribution selection UX.

**Scope**
- Public Dream Board view.
- Contribution selection UI.
- Charity overflow view when funded.
- Shareable URL UX and metadata.

**Tasks**
- Build guest view page with progress bar and CTA.
- Implement contribution form with validation and fee display.
- Switch to charity-only view after goal reached (gift hidden).
- Add OG tags for sharing.
- Add thank-you page flow.

**Acceptance Criteria**
- Guests see gift until funded, then charity-only view.
- Fee display accurate and compliant.
- Mobile-first UI passes UX requirements.

**Verification Commands**
- `pnpm test journeys`

---

## Phase 5 — Payments + Reconciliation

**Goal:** Full payment coverage across PayFast, Ozow, SnapScan.

**Scope**
- PayFast redirect + ITN hardening.
- Ozow One API (EFT) redirect + Svix webhooks.
- SnapScan QR flow + webhook verification.
- Payment status reconciliation and idempotency.

**Tasks**
- Implement provider abstraction layer.
- PayFast: signature, source validation, amount check, validate endpoint, idempotency.
- Ozow: OAuth token caching, payment creation, Svix webhook verification.
- SnapScan: QR URL generation, webhook HMAC verification, status polling fallback.
- Payment provider selection UI.
- Contribution status updates and audit logs.
- Reconciliation jobs and discrepancy alerts.

**Acceptance Criteria**
- Successful payment updates contributions and totals across providers.
- Webhook replays are idempotent.
- Reconciliation surfaces discrepancies.
- Open questions documented and tracked.

**Verification Commands**
- `pnpm test payments`
- `pnpm test webhooks`

---

## Phase 6 — Payouts + Admin Console + Audit Logs

**Goal:** Admin operations for payouts, refunds, auditability.

**Scope**
- Payout calculation (gift + overflow).
- Admin console for payout approvals.
- Refund processing (provider-specific).
- Audit log system.

**Tasks**
- Implement payout calculation engine and ledger.
- Admin UI: payout queue, status changes, notes, export.
- Manual payout workflow for Takealot gift cards, Karri top-ups, philanthropy donations.
- Refund support (PayFast/Ozow/SnapScan where available).
- Audit logging for all admin actions.

**Acceptance Criteria**
- Payouts created correctly for gift + overflow.
- Admin actions logged with actor + timestamp + reason.
- Refund workflow documented and verified.

**Verification Commands**
- `pnpm test payouts`

---

## Phase 7 — Integrations Deepening

**Goal:** Automated integrations for Takealot, Karri, philanthropy partners.

**Scope**
- Karri API integration (top-ups).
- Takealot gift card automation (when available).
- Charity disbursement tracking and receipts.

**Tasks**
- Implement Karri API flow per `KARRI.md`.
- Implement Takealot gift card automation or partner API.
- Implement philanthropy partner workflows and receipts.
- Add integration health checks and error handling.

**Acceptance Criteria**
- Automated payouts execute without manual steps where API exists.
- Failure modes visible in admin console.

**Verification Commands**
- `pnpm test integrations`

---

## Phase 8 — Public API + Enterprise Hardening + Launch

**Goal:** Partner API, compliance, scale, and production launch readiness.

**Scope**
- Public API v1 per `API.md`.
- API auth, rate limits, monitoring.
- Performance, load, and security audits.
- Launch runbook and on-call rotation.

**Tasks**
- Implement API auth (API keys, scopes, rate limiting).
- Document API usage and error codes.
- Load testing for guest + payment flows.
- Pen test and security review.
- Finalize ops runbooks and incident response.
- Production readiness review + launch checklist.

**Acceptance Criteria**
- Public API meets spec and rate limits.
- Performance targets meet NFRs.
- Security audit signed off.
- Launch checklist complete.

**Verification Commands**
- `pnpm test api`
- `pnpm test e2e`
- `pnpm test load`

---

## Risks and Dependencies

- Payment provider onboarding timelines (PayFast/Ozow/SnapScan).
- Karri API availability and commercial terms.
- Charity disbursement partner requirements.

## Open Questions Tracking

- PayFast gaps: `docs/payment-docs/payfast-open-questions.md`
- Ozow gaps: `docs/payment-docs/ozow-oneapi-open-questions.md`
- SnapScan gaps: `docs/payment-docs/snapscan-open-questions.md`

