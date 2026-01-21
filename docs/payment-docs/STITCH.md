# Stitch Payments Reference

> **Source:** https://docs.stitch.money/api and linked docs (Jan 2026)
> **Status:** Under evaluation for ChipIn

---

## Summary

Stitch provides a GraphQL-based payments platform with pay-ins (Pay By Bank, Card, Manual EFT, Cash, Crypto, Wallets), payouts (Disbursements), and webhooks. Authentication uses OAuth2 client tokens for payment requests and disbursements. Webhooks are delivered via Svix with signature verification and retries. The API endpoint is GraphQL-only.

---

## Key URLs

- **GraphQL API:** `https://api.stitch.money/graphql`
- **OAuth token endpoint:** `https://secure.stitch.money/connect/token`
- **OAuth authorize endpoint (user tokens):** `https://secure.stitch.money/connect/authorize`
- **Stitch IDE:** `https://ide.stitch.money/`

---

## Authentication

### Client Tokens (OAuth2 Client Credentials)

Used for payment requests, disbursements, refunds, etc.

- **Endpoint:** `POST https://secure.stitch.money/connect/token`
- **grant_type:** `client_credentials`
- **audience:** `https://secure.stitch.money/connect/token`
- **Scopes (selected):**
  - `client_paymentrequest` (Pay By Bank payment requests)
  - `client_disbursement` (payouts)
  - `client_refund` (refunds)
  - `transaction_initiate` / `transaction_cancel` (card/wallet flows)
  - `client_webhooks_dashboard` (Svix portal login URL)

Token response includes `access_token`, `expires_in` (seconds), `scope`.

### User Tokens (OAuth2 Authorization Code + PKCE)

Used for bank data access (accounts, balances, transactions). Not required for Pay By Bank payment requests. Includes redirect-based authorization, PKCE, and refresh tokens.

---

## Pay-ins

### Pay By Bank (Payment Initiation Requests)

**Flow**
1. Create payment request via GraphQL mutation (requires `client_paymentrequest` scope).
2. Response includes **payment request `id`** and **`url`**.
3. Redirect user to `url` with appended `redirect_uri` query param (must be whitelisted, HTTPS in prod).
4. On completion/cancel, Stitch redirects to `redirect_uri` with query params: `id`, `status`, `externalReference`.
5. **Do not trust `status` query param** for final state; use webhooks as source of truth.
6. Optionally poll payment request status by `id` over GraphQL.

**Important constraints**
- `payerReference` max 12 chars
- `beneficiaryReference` max 20 chars
- `beneficiaryName` max 20 chars
- `externalReference` max 4096 chars
- Recommended: set `expireAt` (ISO 8601) to auto-expire pending requests
- `payerInformation` (at minimum `payerId`) used for fraud checks
- `metadata` supports enrichment (shipping info, delivery method, etc.)

**Statuses**
- `PaymentInitiationRequestPending`
- `PaymentInitiationRequestCompleted`
- `PaymentInitiationRequestCancelled`
- `PaymentInitiationRequestExpired`

**Webhooks**
- Sent for Completed, Cancelled, Expired
- Signed webhooks delivered via Svix

### Card Payments

- Supports **once-off** (hosted UI or secure API) and **tokenized** flows
- Hosted UI offloads PCI to Stitch
- Secure API integration provides full control but requires PCI compliance

### Other Pay-ins

- **Manual EFT:** initiated from banking app; payment request-driven; webhooks + reconciliation
- **Cash / Cash at Till:** generates instructions or barcode; attributed to user
- **Crypto:** payment request; fiat amount specified in ZAR; conversion handled by Stitch

---

## Payouts (Disbursements)

**Notes**
- Only available to South African customers
- **Float account required**
- Contact `support@stitch.money` for enablement

**Creation**
- GraphQL mutation with `client_disbursement` scope
- Requires `nonce` for idempotency (max 4096 chars)
- `beneficiaryReference` required (max 20 chars)
- `externalReference` optional (max 4096 chars)
- `type`: `INSTANT` or `DEFAULT`

**Status handling**
- Statuses include: `DisbursementSubmitted`, `DisbursementCompleted`, `DisbursementError`, `DisbursementPaused`, `DisbursementCancelled`, `DisbursementReversed`
- If insufficient funds: disbursement pauses for up to 7 days, then errors
- Retry logic: reuse same `nonce`

**Webhooks**
- Signed webhooks for disbursement status updates

---

## Webhooks

- Used for all payment types
- Signed webhook payloads (Svix)
- Exponential retry on failures
- Recommended as source of truth over redirect query params

---

## Sandbox

- Supports test access for pay-ins/payouts
- Test bank credentials + OTP available for redirect flows

---

## ChipIn Fit Assessment (Initial)

**Potential wins**
- Single provider for pay-ins + payouts
- GraphQL API with strong typing
- Webhooks standardization via Svix

**Open questions**
- Commercial terms vs PayFast/Ozow/SnapScan
- Float account operational requirements for payouts
- Coverage for card + EFT + QR equivalence
- Settlement timing and fees
- Gift card purchasing support (likely still external)

---

## References (Pages Reviewed)

- `https://docs.stitch.money/quick-start`
- `https://docs.stitch.money/authentication/introduction`
- `https://docs.stitch.money/authentication/client-tokens`
- `https://docs.stitch.money/authentication/user-tokens`
- `https://docs.stitch.money/payment-products/`
- `https://docs.stitch.money/payment-products/payins/paybybank/introduction`
- `https://docs.stitch.money/payment-products/payins/paybybank/integration-process`
- `https://docs.stitch.money/payment-products/payins/paybybank/capitec-pay/introduction`
- `https://docs.stitch.money/payment-products/payins/card/introduction`
- `https://docs.stitch.money/payment-products/payins/manual-eft/introduction`
- `https://docs.stitch.money/payment-products/payins/cash/introduction`
- `https://docs.stitch.money/payment-products/payins/crypto/introduction`
- `https://docs.stitch.money/payment-products/payouts/disbursements`
- `https://docs.stitch.money/webhooks/`
- `https://docs.stitch.money/graphql`
- `https://docs.stitch.money/sandbox`
