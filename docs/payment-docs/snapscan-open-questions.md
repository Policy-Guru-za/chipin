# SnapScan docs: known gaps / uncertainties

Grouped questions an integrator typically needs answered, based on what is *not* specified in the canonical SnapScan developer docs.

## Auth

- `https://developer.getsnapscan.com/#authentication`: How are API keys issued and managed (dashboard path, self-serve vs support, multiple keys per merchant, rotation/revocation)?
- `https://developer.getsnapscan.com/#authentication`: Are there separate API keys for sandbox vs production (or a single key with environment scoping)?

## Payments

- `https://developer.getsnapscan.com/#qr-codes`: Is the `amount` parameter always specified in cents (the examples use `amount=1000` for R10.00), and is the currency always ZAR?
- `https://developer.getsnapscan.com/#creating-the-url`: What are the maximum lengths and character constraints for `id` (merchant reference) and any extra query parameters?
- `https://developer.getsnapscan.com/#limiting-successful-payments-to-unique-id`: What exact behaviour occurs when `strict=true` and the customer attempts:
  - a second payment with the same `id`, or
  - a payment lower than `amount`?
  (Error surfaced in-app only, or also reflected via webhook/API in a special way?)
- `https://developer.getsnapscan.com/#the-payment-object`: When/why is `deviceSerialNumber` present, and is it stable per device / merchant POS setup?
- `https://developer.getsnapscan.com/#the-payment-object`: Refund transaction type exists (`transactionType` can be `refund`) but refunds/reversals/voids are not documented. Is there any API surface for creating/reading refunds, or are refunds handled operationally/offline?

## Webhooks

- `https://developer.getsnapscan.com/#webhook`: What are the complete webhook delivery semantics (retry schedule and max attempts beyond “multiple times over 3 minutes”)?
- `https://developer.getsnapscan.com/#webhook`: Are there IP ranges or mTLS options for webhook delivery, or recommended network controls?
- `https://developer.getsnapscan.com/#webhook`: Is webhook payload always the full payment object, and can fields be omitted/added over time (versioning/compat guarantees)?
- `https://developer.getsnapscan.com/#verifying-payload-authenticity`: How is the Webhook Authentication Key issued/rotated/revoked, and can multiple keys be active concurrently during rotation?

## Environments

- `https://developer.getsnapscan.com/#api-overview`: No sandbox/test environment is described. Is there a dedicated sandbox host (e.g., non-production `pos.snapscan.io`) and any test SnapCodes or test card behaviour?
- `https://developer.getsnapscan.com/#payments`: Are there environment-specific rate limits and/or different availability SLOs?

## Reconciliation

- `https://developer.getsnapscan.com/#cash-ups`: How do cash ups relate to settlement batching and bank payout timing (is `statementReference` always present after settlement, and when)?
- `https://developer.getsnapscan.com/#get-all-cash-up-payments`: What is the recommended polling cadence/backoff strategy when a cash up period returns 500 due to pending payments?
