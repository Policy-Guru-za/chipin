# Ozow One API — Known Gaps / Open Questions

## Auth and signing
- What is the recommended token caching strategy (single shared token vs per-scope token) and are there any revocation/rotation behaviours integrators must handle? (closest URL: https://hub.ozow.com/docs/one-api/0fd0fd9234b63-authentication)
- Are there any IP allowlisting requirements for API clients in production (egress IPs), or is TLS + credentials sufficient? (closest URL: https://hub.ozow.com/docs/one-api/0fd0fd9234b63-authentication)

## Payments
- What are the complete payment request status values and lifecycle beyond `created`/`expired` (OpenAPI PaymentStatus enum)? (closest URL: https://hub.ozow.com/docs/one-api/yu4y4luah3arn-quickstart-payments)
- What information (query params, POST data, etc.) is provided on the `returnUrl` redirect back to the merchant, and how should it be validated? (closest URL: https://hub.ozow.com/docs/one-api/yu4y4luah3arn-quickstart-payments)
- For direct payment types (eg card), what are the exact compliance prerequisites and onboarding steps (PCI evidence, whitelists, approvals) before these fields are accepted in production? (closest URL: https://hub.ozow.com/docs/one-api/0cpheyi908oy5-direct-payments-advanced-feature)

## Callbacks/webhooks
- What is the exact JSON schema of `transaction.complete` and `refund.complete` events as delivered (field names, nesting), especially for `messageType=full`? (closest URL: https://hub.ozow.com/docs/one-api/be561bda5c46d-webhooks)
- What webhook retry schedule, backoff, and maximum delivery attempts does Ozow/Svix use for failed deliveries in this integration? (closest URL: https://hub.ozow.com/docs/one-api/be561bda5c46d-webhooks)
- What clock-skew tolerance should be used when validating `svix-timestamp`? (closest URL: https://hub.ozow.com/docs/one-api/be561bda5c46d-webhooks)

## Environments
- What is the staging base URL for the Basic API (`/v1/basic`) endpoints (docs list staging host but not Basic-specific base URL)? (closest URL: https://hub.ozow.com/docs/one-api/u9dgo2smpkkz3-overview)

## Reconciliation
- Are settlements available near real-time, or only after a settlement batch runs? What is the expected availability delay? (closest URL: https://hub.ozow.com/docs/one-api/hl95up5kkviui-settlements-api)

## Errors and edge cases
- What are the authoritative, complete lists of application-specific error `code` values and their meanings (beyond JSON:API structure)? (closest URL: https://hub.ozow.com/docs/one-api/fbc01bdf1acdd-responses)
- What are the published rate limits (requests per time window) per endpoint/client, and are there separate burst vs sustained limits? (closest URL: https://hub.ozow.com/docs/one-api/fbc01bdf1acdd-responses)
