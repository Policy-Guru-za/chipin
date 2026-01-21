# Ozow One API — Known Gaps / Open Questions

This file records Phase 1 decisions and assumptions to unblock integration.

## Auth and signing
- Token caching strategy?
  - Resolution: cache per-scope access tokens using `expires_in`; refresh on expiry or 401.
  - Status: Assumption (docs do not mention revocation/rotation).
- IP allowlisting required?
  - Resolution: not documented; assume TLS + credentials only; confirm for production.

## Payments
- Payment request status values?
  - Resolution: treat payment `status` as opaque; rely on transaction status (`incomplete|successful|error|pending|refunded`) for finality; handle `expired` when payment requests expire.
  - Status: Assumption pending Ozow enum confirmation.
- `returnUrl` parameters and validation?
  - Resolution: treat returnUrl params as untrusted; reconcile via webhooks or `GET /transactions/{id}`.
- Direct payment prerequisites (card, etc.)?
  - Resolution: out of scope Phase 1; use redirect flow only (no PCI obligations).

## Callbacks / webhooks
- `transaction.complete` / `refund.complete` schema?
  - Resolution: verify Svix signature, then fetch authoritative details via Ozow APIs; do not rely on payload fields.
- Retry schedule / backoff?
  - Resolution: not documented; assume Svix defaults; implement idempotent processing + replay endpoints.
- Clock skew tolerance for `svix-timestamp`?
  - Resolution: use Svix library default (configurable) until Ozow specifies otherwise.

## Environments
- Staging base URL for Basic API (`/v1/basic`)?
  - Resolution: assume `https://stagingone.ozow.com/v1/basic` (mirror production) if needed; confirm before use.

## Reconciliation
- Settlement timing?
  - Resolution: treat settlements as batch-delayed; no real-time dependency in Phase 1.

## Errors and edge cases
- Error `code` catalog?
  - Resolution: treat `code` as opaque; log `title` and `detail`.
- Rate limits?
  - Resolution: not documented; handle 429 with exponential backoff and alerting.
