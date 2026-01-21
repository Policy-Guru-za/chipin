# Ozow One API Developer Reference (Integration-Focused)

## 1. Scope and Audience
- Covers Ozow One API (Beta) One API + Basic API surfaces, focused on implementing payments, transactions, refunds, settlements, and webhook integrations.
- Excludes non-One-API Ozow products and non-technical marketing content.
- Intended reader: AI coding agents (GPT-5.2 Codex) integrating Ozow One API into existing application platforms.

## 2. Canonical Sources and Versioning
- Docs base URL: `https://hub.ozow.com/docs/one-api`
- OpenAPI reference (Stoplight): `https://hub.ozow.com/reference/OneAPI.yaml` (download via the `Export` menu on the One API page)
- OpenAPI reference (Basic): `https://hub.ozow.com/reference/OneAPIBasic.yaml` (download via the `Export` menu on the One API - Basic page)
- Versioning: URI path versioning, e.g. `https://one.ozow.com/v1/...` (v1 currently documented).
- Key pages used:
  - Overview: https://hub.ozow.com/docs/one-api/u9dgo2smpkkz3-overview
  - Authentication: https://hub.ozow.com/docs/one-api/0fd0fd9234b63-authentication
  - Quickstart - Payments: https://hub.ozow.com/docs/one-api/yu4y4luah3arn-quickstart-payments
  - Responses: https://hub.ozow.com/docs/one-api/fbc01bdf1acdd-responses
  - Idempotency: https://hub.ozow.com/docs/one-api/e082beb550e68-idempotency
  - Versioning: https://hub.ozow.com/docs/one-api/d2ff05889cebe-versioning
  - Webhooks: https://hub.ozow.com/docs/one-api/be561bda5c46d-webhooks
  - Refunds: https://hub.ozow.com/docs/one-api/tov45lvu4ik2p-refunds
  - Settlements API: https://hub.ozow.com/docs/one-api/hl95up5kkviui-settlements-api
  - WebSockets: https://hub.ozow.com/docs/one-api/9wl8fc3a5qe92-web-sockets
  - Direct Payments (Advanced Feature): https://hub.ozow.com/docs/one-api/0cpheyi908oy5-direct-payments-advanced-feature
  - One API (OpenAPI reference hub): https://hub.ozow.com/docs/one-api/6sdgrgaftqdix-one-api
  - One API - Basic (OpenAPI reference hub): https://hub.ozow.com/docs/one-api/9j3xvyjio4xjc-one-api-basic

## 3. Quick Integration Summary (One Page)
1. Create One API client credentials (`client_id`, `client_secret`) in the Ozow Dashboard (or Staging Dashboard).
2. Obtain an OAuth 2.0 access token via `POST https://one.ozow.com/v1/token` (or Staging equivalent) using Client Credentials grant.
3. Initiate a payment request: `POST /payments` (Bearer token) and capture the returned `redirectUrl`.
4. Redirect the payer to `redirectUrl` to complete payment on Ozow-hosted UX (redirect flow).
5. Verify outcome:
   - Prefer webhooks (`transaction.complete`) for async completion, or
   - Poll status via `GET /transactions/{id}` / `GET /payments/{id}` (see flows below).
6. Implement operational headers:
   - `Idempotency-Key` on all `POST`/`PATCH` write calls (recommended).
   - `X-Correlation-ID` to trace requests (recommended).
7. For refunds: ensure your Ozow refund float is topped up; request refunds via `POST /transactions/{id}/refunds` or batch `POST /refunds`.

If you only read one section, read this: OAuth token acquisition + `POST /payments` redirect flow + webhook verification.

## 4. Core Concepts and Objects
- `client_id` / `client_secret`: created in Ozow Dashboard; scoped to merchant or merchant site; includes permission scopes.
- Access token: OAuth 2.0 bearer token used in `Authorization: Bearer <token>` for most endpoints.
- Payment request (`/payments`): creates a hosted payment/redirect link; may contain links to related resources (`transactions`, `cancel`).
- Transaction (`/transactions`): represents an execution attempt/flow for a payment; completion triggers webhook events (if configured).
- Refund (`/refunds`): refunds against a transaction; refund completion can trigger `refund.complete` webhook.
- Settlement (`/settlements`): settlement summaries and line items for reconciliation.
- Webhook subscription (`/webhooks`): configuration stored in Ozow; each subscription has an id and secret used to verify signatures.

## 5. Environments, Credentials, and Access
- Environments (docs):
  - Production API base: `https://one.ozow.com` (v1 base: `https://one.ozow.com/v1`)
  - Staging API base: `https://stagingone.ozow.com` (v1 base: `https://stagingone.ozow.com/v1`)
  - Production dashboard: `https://dash.ozow.com`
  - Staging dashboard: `https://stagingdash.ozow.com`
- Token credentials (`client_id`/`client_secret`) are managed in:
  - Production: `https://dash.ozow.com/MerchantAdmin/OneAPI/Clients`
  - Staging: `https://stagingdash.ozow.com/MerchantAdmin/OneAPI/Clients`
- Permission scopes available (docs): `payment`, `payout`, `refund`, `settlements`, `webhooks`.
- API key credentials (Basic API only): retrieved from merchant details in dashboards; sent as `apiKey: <value>` header.

## 6. Authentication and Request Integrity
### OAuth 2.0 Client Credentials (recommended)
- Token endpoint (prod): `https://one.ozow.com/v1/token`
- Token endpoint (staging): `https://stagingone.ozow.com/v1/token`
- Request: `application/x-www-form-urlencoded` with `client_id`, `client_secret`, `scope`, `grant_type=client_credentials`.
- Response: RFC 6749 token response with `access_token`, `token_type=bearer`, `expires_in`, `scope`.
- Use in subsequent calls: `Authorization: Bearer <access_token>`.

### API Key (Basic API only)
- Header: `apiKey: <your-api-key>`
- Only available for `v1/basic` endpoints (payments create/status/transactions).

### Idempotency
- For `POST`/`PATCH` operations: provide `Idempotency-Key` header to make calls idempotent.
- Behaviour (docs):
  - Duplicate `POST` with same payload + key returns previous response; may return `200 OK` instead of `201 Created` when replayed.
  - Same key with different payload returns `409 Conflict`.
- Header name: `Idempotency-Key`.

### Correlation IDs
- Optional request header: `X-Correlation-ID` (UUID) for tracing; returned in response header.
- Some endpoints also accept `X-Forwarded-For` (payer IP) as per OpenAPI.

### Webhook signature verification
- Webhooks implement the Standard Webhooks spec and are delivered via Svix.
- Headers (docs): `svix-id`, `svix-timestamp`, `svix-signature` (Base64 encoded list of signatures, space-delimited).
- Retrieve the per-subscription secret via `GET /webhooks/{id}/secret` and verify using Svix libraries or manual procedure (Svix docs).

Common signing mistakes and how to avoid them:
- Use the exact raw request body bytes when verifying signatures (no JSON re-serialisation).
- Treat `svix-timestamp` as seconds since epoch and reject excessive clock skew (Svix docs; Ozow docs do not specify tolerance).
- Use the correct webhook secret for the subscription id that delivered the event.

## 7. Payment Flows
### Standard payment initiation (redirect flow)
- Purpose: create a payment request and redirect the payer to Ozow-hosted payment UI.
- Preconditions: `client_id`/`client_secret` with `payment` scope; `siteCode` configured; return URL available.
- Sequence:
  1. `POST /token` to obtain `access_token`.
  2. `POST /payments` with `siteCode`, `amount`, `merchantReference`, `expireAt`, `returnUrl`.
  3. Redirect payer to `redirectUrl` from response.
  4. On completion, verify via webhooks or status query.
- Edge cases:
  - Link expiry: payment request status may become `expired`.
  - Duplicate create: use `Idempotency-Key` to prevent accidental duplicates.

### Payment status query / verification
- Purpose: confirm outcome server-side.
- Common options (OpenAPI):
  - `GET /payments/{id}`: get payment request status (request-level).
  - `GET /payments/{id}/transactions`: list transactions associated with a payment request.
  - `GET /transactions/{id}`: get transaction status (attempt-level).
- Notes:
  - Transaction status enum (OpenAPI): `incomplete`, `successful`, `error`, `pending`, `refunded`.

### Refunds (if applicable)
- Purpose: refund previously completed transactions.
- Preconditions: Ozow refund float topped up (docs).
- Flows (docs/OpenAPI):
  - Single transaction: `POST /transactions/{id}/refunds` with `amount`, `reason`, optional `notifyUrl`, and `realTimePayment`.
  - Batch: `POST /refunds` with an array of refund requests.
- Refund status enum (docs/OpenAPI): `pending`, `complete`, `submitted`, `failed`, `cancelled`, `returned`.

### Reconciliation / settlements
- Purpose: reconcile Ozow settlements and derive settlement totals.
- Sequence:
  1. `GET /settlements` in a date range.
  2. `GET /settlements/{id}` for summary.
  3. `GET /settlements/{id}/lineitems` for line-item detail.

## 8. Callbacks, Webhooks, and Event Handling
- Event types (docs): `transaction.complete`, `refund.complete`.
- Message types (docs):
  - `thin`: id + status only.
  - `full`: includes `data` property with details.

### Payload schemas
- Webhook event envelope: referenced as Standard Webhooks spec (Ozow docs do not reproduce full JSON schema).
- UNKNOWN (docs did not specify): the exact JSON field names/shape of `transaction.complete` and `refund.complete` payloads as delivered by Ozow (beyond the Standard Webhooks/Svix envelope).
- Best practice: treat webhook events as untrusted; verify signature; then fetch authoritative status via `GET /transactions/{id}` / `GET /refunds/{id}`.

### Verification steps (Svix)
1. Read `svix-id`, `svix-timestamp`, `svix-signature` headers.
2. Look up webhook subscription secret via `GET /webhooks/{id}/secret` (store/rotate secrets securely).
3. Verify with Svix verification library using the raw request body.
4. On success: parse event, apply idempotency (dedupe by event/message id), and process.

### Retry behaviour, ordering, failure modes
- Ozow docs state Svix is used; for retry schedule/ordering semantics, refer to Svix receiving docs.
- Use the `svix-id` message identifier for deduplication (docs note it remains the same when resent).
- Implement idempotent event processing keyed by (`event_id`/`svix-id`) and store a processed marker.

## 9. API Reference (Consolidated)
- Base URL (One API): `https://one.ozow.com/v1` (staging: `https://stagingone.ozow.com/v1`)
- Base URL (Basic): `https://one.ozow.com/v1/basic` (staging: UNKNOWN (docs did not specify): Basic API staging base URL)

### authentication
### Generate Authentication Token
- Method + path: `POST /token`
- Auth: None
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
- Request body:
  - Required: no
  - Content types: `application/x-www-form-urlencoded`
  - `application/x-www-form-urlencoded` schema: `TokenRequest`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | Succesfull response as per [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-5.1) | `TokenResponse` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |

### bankaccount
### Bank Account Verification
- Method + path: `POST /bankaccount/verify`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `BankAccountVerificationRequest`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `BankAccountVerificationResponse` (application/json) |
| 201 | Created | `BankAccountVerificationResponse` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 409 | Conflict. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |

### payments
### Get Payment Methods
- Method + path: `GET /paymentmethods`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Forwarded-For` | `header` | no | `string<ipv4>` | The IP address of the end-consumer. |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `siteCode` | `query` | yes | `string` | The merchant site code. |
| `region` | `query` | no | `string` | The applicable region identifer in [ISO 3166-Alpha-2](https://www.iso.org/obp/ui/#search) format. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `object` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### List Payments
- Method + path: `GET /payments`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
| `fromDate` | `query` | yes | `string<date-time>` | The date from which to filter. |
| `toDate` | `query` | yes | `string<date-time>` | The date to filter up to. |
| `siteCode` | `query` | no | `string` | The merchant site code. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `object` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Request Payment
- Method + path: `POST /payments`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `PaymentRequest`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `PaymentResponse` (application/json) |
| 201 | Created | `PaymentResponse` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 409 | Conflict. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Payment Request
- Method + path: `POST /payments`
- Auth: API Key header `apiKey`
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `Payment-ID` | `header` | yes | `integer` | A unique identifier for this payment request. |
| `Payment-Timestamp` | `header` | yes | `string` | Integer unix timestamp (seconds since epoch). |
| `Payment-Signature` | `header` | yes | `string` | The signature of this payment which is the `Payment-ID.Payment-Timestamp.Payload` HMAC-SHA256 encrypted with the Merchant's Private Key (available on the Ozow Dashboard). |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `PaymentRequest`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK. | `PaymentRequestResponse` (application/json) |
| 201 | Created. | `PaymentRequestResponse` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 409 | Conflict. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Payment Status by Id
- Method + path: `GET /payments/{id}`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string<uuid>` | The unique identifier of the payment. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `PaymentResponse` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Payment Status by Id
- Method + path: `GET /payments/{id}`
- Auth: API Key header `apiKey`
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string` | The unique identifier of the payment. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `PaymentRequestResponse` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Cancel Payment Request
- Method + path: `POST /payments/{id}/cancel`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string<uuid>` | The unique identifier of the payment. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK. The payment has been cancelled. | — |
| 201 | Created. The payment has been cancelled | — |
| 403 | Forbidden. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### List Transactions for Payment
- Method + path: `GET /payments/{id}/transactions`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
| `fromDate` | `query` | yes | `string<date-time>` | The date from which to filter. |
| `toDate` | `query` | yes | `string<date-time>` | The date to filter up to. |
| `id` | `path` | yes | `string<uuid>` | The unique identifier of the payment. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK. | `object` (application/json) |
| 400 | Bad Request | `Error` (application/json) |
| 401 | Unauthorized | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### List Transactions for Payment
- Method + path: `GET /payments/{id}/transactions`
- Auth: API Key header `apiKey`
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `id` | `path` | yes | `string` | The unique identifier of the payment. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK. | `object` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Request Transaction for Payment
- Method + path: `POST /payments/{id}/transactions`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `id` | `path` | yes | `string<uuid>` | The unique identifier of the payment. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `PaymentDetail`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `object` (application/json) |
| 201 | Created | `object` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 409 | Conflict. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Regions
- Method + path: `GET /regions`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `object` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |

### refunds
### List Refunds
- Method + path: `GET /refunds`
- Auth: OAuth 2.0 (scopes: refund)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
| `fromDate` | `query` | yes | `string<date-time>` | The date from which to filter. |
| `toDate` | `query` | yes | `string<date-time>` | The date to filter up to. |
| `siteCode` | `query` | no | `string` | The merchant site code. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `RefundList` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Request Refunds
- Method + path: `POST /refunds`
- Auth: OAuth 2.0 (scopes: refund)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `array<RefundRequest>`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK. The refund has been accepted. | `array<Refund>` (application/json) |
| 201 | Created.  The refund has been accepted. | `Refund` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 409 | Conflict. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Refund
- Method + path: `GET /refunds/{id}`
- Auth: OAuth 2.0 (scopes: refund)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string<uuid>` | The refund identifier. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `Refund` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Cancel Refund
- Method + path: `POST /refunds/{id}/cancel`
- Auth: OAuth 2.0 (scopes: refund)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string<uuid>` | The refund identifier. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `object`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK. The refund has been cancelled. | — |
| 201 | Created.  The refund has been cancelled | — |
| 400 | Bad Request | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Refund Notifications
- Method + path: `GET /refunds/{id}/notifications`
- Auth: OAuth 2.0 (scopes: refund)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string` | The refund identifier. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `array<WebhookMessageStatus>` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Resend Refund Notifications
- Method + path: `POST /refunds/{id}/notifications/resend`
- Auth: OAuth 2.0 (scopes: refund)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string` | The refund identifier. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 202 | Accepted. | — |
| 400 | Bad Request. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |

### settlements
### List Settlements
- Method + path: `GET /settlements`
- Auth: OAuth 2.0 (scopes: settlements)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
| `fromDate` | `query` | yes | `string<date-time>` | The date from which to filter. |
| `toDate` | `query` | yes | `string<date-time>` | The date to filter up to. |
| `siteCode` | `query` | no | `string` | The merchant site code. |
| `reference` | `query` | no | `string` | The settlement reference. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `SettlementList` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Settlement
- Method + path: `GET /settlements/{id}`
- Auth: OAuth 2.0 (scopes: settlements)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string` | The settlement identifier. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `Settlement` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### List Settlement Line Items
- Method + path: `GET /settlements/{id}/lineitems`
- Auth: OAuth 2.0 (scopes: settlements)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
| `id` | `path` | yes | `string` | The settlement identifier. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `SettlementLineItemList` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |

### transactions
### List Transactions
- Method + path: `GET /transactions`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
| `fromDate` | `query` | yes | `string<date-time>` | The date from which to filter. |
| `toDate` | `query` | yes | `string<date-time>` | The date to filter up to. |
| `siteCode` | `query` | no | `string` | The merchant site code. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `object` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Request Transaction
- Method + path: `POST /transactions`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `TransactionRequest`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `object` (application/json) |
| 201 | Created | `object` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 409 | Conflict. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Transaction Status by Id
- Method + path: `GET /transactions/{id}`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string<uuid>` | The unique identifier of the transaction. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `Transaction` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Process Transaction Step
- Method + path: `POST /transactions/{id}`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `id` | `path` | yes | `string<uuid>` | The unique identifier of the transaction. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `ProcessTransactionRequest`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | — |
| 201 | Created | — |
| 400 | Bad Request | — |
| 401 | Unauthorized | — |
| 403 | Forbidden | — |
| 409 | Conflict | — |
| 500 | Internal Server Error | — |
### Get Transaction Notifications
- Method + path: `GET /transactions/{id}/notifications`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string<uuid>` | The unique identifier of the transaction. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `array<WebhookMessageStatus>` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Resend Transaction Notifications
- Method + path: `POST /transactions/{id}/notifications/resend`
- Auth: OAuth 2.0 (scopes: payment)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string` | The unique identifier of the transaction. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 202 | Accepted. | — |
| 400 | Bad Request. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Refunds
- Method + path: `GET /transactions/{id}/refunds`
- Auth: OAuth 2.0 (scopes: refund)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
| `id` | `path` | yes | `string<uuid>` | The unique identifier of the transaction. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `RefundList` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Request Refund
- Method + path: `POST /transactions/{id}/refunds`
- Auth: OAuth 2.0 (scopes: refund)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string<uuid>` | The unique identifier of the transaction. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `TransactionRefundRequest`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK.  The refund has been accepted. | `Refund` (application/json) |
| 201 | Created.  The refund has been accepted. | `Refund` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 409 | Conflict. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |

### webhooks
### List Webhook Subscriptions
- Method + path: `GET /webhooks`
- Auth: OAuth 2.0 (scopes: webhooks)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Forwarded-For` | `header` | no | `string<ipv4>` | The IP address of the end-consumer. |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `limit` | `query` | no | `integer` | The maximum number of items to return. |
| `offset` | `query` | no | `integer<int32>` | The number of items to discard in this paging operation. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `object` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Create Webhook Subscription
- Method + path: `POST /webhooks`
- Auth: OAuth 2.0 (scopes: webhooks)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `WebhookRequest`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK. The request has been accepted. | `WebhookResponse` (application/json) |
| 201 | Created. The request has been accepted. | `WebhookResponse` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 409 | Conflict. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Delete Webhook Subscription
- Method + path: `DELETE /webhooks/{id}`
- Auth: OAuth 2.0 (scopes: webhooks)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string` | The unique identifier of the webhook subscription. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 204 | No Content | — |
| 400 | Bad Request. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Webhook Subscription
- Method + path: `GET /webhooks/{id}`
- Auth: OAuth 2.0 (scopes: webhooks)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string` | The unique identifier of the webhook subscription. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `WebhookResponse` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 404 | Not found.  The item with the specified identifier could not be found, or this resource is not allowed for the resource identifier. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Update Webhook Subscription
- Method + path: `PUT /webhooks/{id}`
- Auth: OAuth 2.0 (scopes: webhooks)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string` | The unique identifier of the webhook subscription. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `WebhookRequest`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK. The update request was accepted. | `WebhookResponse` (application/json) |
| 201 | Created. The update request was accepted. | `WebhookResponse` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 409 | Conflict. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Replay Failed Messages
- Method + path: `POST /webhooks/{id}/replay`
- Auth: OAuth 2.0 (scopes: webhooks)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `Idempotency-Key` | `header` | no | `string` | The unique key idempotency key as per the following [IETF Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| `id` | `path` | yes | `string` | The unique identifier of the webhook subscription. |
- Request body:
  - Required: no
  - Content types: `application/json`
  - `application/json` schema: `object`
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 202 | Accepted. The request has been accepted and is being processed. | — |
| 400 | Bad Request. | `Error` (application/json) |
| 403 | Forbidden. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |
### Get Webhook Secret
- Method + path: `GET /webhooks/{id}/secret`
- Auth: OAuth 2.0 (scopes: payment, payout, refund, settlements, webhooks)
- Parameters:
| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| `X-Correlation-ID` | `header` | no | `string<uuid>` | Optional correlation id for the request, if not supplied a new one will be generated and passed onto all underlying requests and returned as a header. |
| `id` | `path` | yes | `string` | The unique identifier of the webhook subscription. |
- Responses:
| Status | Meaning | Body schema |
|---:|---|---|
| 200 | OK | `WebhookSecretResponse` (application/json) |
| 400 | Bad Request. | `Error` (application/json) |
| 401 | Unauthorised. | `Error` (application/json) |
| 500 | Internal Server Error. | `Error` (application/json) |

## 10. Errors, Status Codes, and Troubleshooting
- Error model: JSON:API error object (docs).
- Common responses (docs):
  - `400 Bad Request`: input validation failure.
  - `401 Unauthorized`: authentication/authorisation failure.
  - `403 Forbidden`: invalid action / insufficient access.
  - `409 Conflict`: idempotency key reuse with different payloads; resource conflicts.
  - `429 Too Many Requests`: rate limit exceeded (limit not documented).
- Use `X-Correlation-ID` when raising support tickets.

## 11. Security and Compliance Notes
- Direct card payments may require PCI certification (docs); merchants without PCI certification should use Ozow redirect flow for sensitive data.
- Webhook signature verification is required to prevent spoofing (Svix headers + per-subscription secret).
- UNKNOWN (docs did not specify): any additional mandated data handling/compliance requirements beyond the above.

## 12. Rate Limits, Performance, and Reliability
- Rate limiting: server may return `429 Too Many Requests` (docs), but thresholds are not specified.
- Retries:
  - API calls: use idempotency keys on retried `POST`/`PATCH` operations.
  - Webhooks: delivered via Svix; retry semantics not specified by Ozow docs (refer to Svix).
- Timeouts: UNKNOWN (docs did not specify): recommended client timeouts and backoff.

## 13. Testing Strategy
- Use staging environment:
  - API base: `https://stagingone.ozow.com/v1`
  - Dashboard: `https://stagingdash.ozow.com`
- Obtain staging client credentials via Staging Dashboard One API Clients.
- Test matrix (suggested):
  - Payment: create payment -> redirect -> successful completion; expiry; cancellation.
  - Transactions: create transaction; poll until terminal state; webhook-delivered completion.
  - Idempotency: repeat identical `POST` with same `Idempotency-Key`; repeat with changed payload -> expect `409`.
  - Refunds: request refund; verify `refund.complete` or poll `GET /refunds/{id}`; cancel before submission.
  - Webhooks: signature verification failure path; replay/resend scenarios.

## 14. Implementation Checklists
- Backend checklist:
  - Store `client_id`/`client_secret` as secrets; never log.
  - Implement token acquisition + caching with expiry (`expires_in`).
  - Use `Idempotency-Key` for write calls.
  - Implement webhook receiver + signature verification + dedupe.
  - Persist authoritative payment/transaction/refund status; reconcile via polling if needed.
- Frontend checklist (redirect flow):
  - Redirect user to `redirectUrl`.
  - Handle `returnUrl` landing page; do not trust query params alone; verify server-side status.
- Ops checklist:
  - Configure webhook endpoints; monitor failures; use correlation ids for support.
  - Implement alerts for webhook delivery failures and elevated `5xx`/`429` responses.

## 15. Copy-Paste Integration Snippets
### Node.js (TypeScript) — raw HTTP (fetch)
```ts
import { z } from 'zod';

const envSchema = z.object({
  OZOw_CLIENT_ID: z.string().min(1),
  OZOw_CLIENT_SECRET: z.string().min(1),
  OZOw_BASE_URL: z.string().url().default('https://one.ozow.com/v1'),
});

const env = envSchema.parse({
  OZOw_CLIENT_ID: process.env.OZOw_CLIENT_ID,
  OZOw_CLIENT_SECRET: process.env.OZOw_CLIENT_SECRET,
  OZOw_BASE_URL: process.env.OZOw_BASE_URL,
});

export async function getOzowAccessToken(scope: string): Promise<{ accessToken: string; expiresIn: number }> {
  const body = new URLSearchParams({
    client_id: env.OZOw_CLIENT_ID,
    client_secret: env.OZOw_CLIENT_SECRET,
    scope,
    grant_type: 'client_credentials',
  });

  const res = await fetch(`${env.OZOw_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Ozow token error: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

export async function createPayment(accessToken: string) {
  const res = await fetch(`${env.OZOw_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      siteCode: 'SITE-001',
      amount: { currency: 'ZAR', value: 99.0 },
      merchantReference: 'ORDER-12345',
      expireAt: '2025-12-31T23:59:59Z',
      returnUrl: 'https://merchant.example.com/payment-return',
    }),
  });
  if (!res.ok) throw new Error(`Ozow create payment error: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string; status: string; redirectUrl?: string };
}

export async function getTransactionStatus(accessToken: string, transactionId: string) {
  const res = await fetch(`${env.OZOw_BASE_URL}/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Ozow transaction status error: ${res.status} ${await res.text()}`);
  return (await res.json()) as unknown;
}
```

### Node.js (TypeScript) — webhook verification (Svix)
```ts
import { Webhook } from 'svix';
import type { Request, Response } from 'express';

// Requires: npm/pnpm package `svix` (Svix verification library).
export function ozowWebhookHandler(webhookSecret: string) {
  const verifier = new Webhook(webhookSecret);

  return (req: Request, res: Response) => {
    const svixId = req.header('svix-id') ?? '';
    const svixTimestamp = req.header('svix-timestamp') ?? '';
    const svixSignature = req.header('svix-signature') ?? '';

    try {
      // IMPORTANT: use raw body bytes (express raw body middleware).
      const payload = (req as any).rawBody?.toString('utf8') ?? JSON.stringify(req.body);
      const event = verifier.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
      // TODO: dedupe using svix-id; then fetch authoritative status via Ozow APIs.
      res.status(200).json({ received: true, type: (event as any).type });
    } catch (err) {
      res.status(400).json({ error: 'Invalid webhook signature' });
    }
  };
}
```

### Python (FastAPI-style) — token + create payment + webhook verification
```py
from __future__ import annotations

import os
import uuid
from fastapi import FastAPI, Header, Request, Response
import httpx
from svix.webhooks import Webhook

OZOW_BASE_URL = os.environ.get('OZOW_BASE_URL', 'https://one.ozow.com/v1')
OZOW_CLIENT_ID = os.environ['OZOW_CLIENT_ID']
OZOW_CLIENT_SECRET = os.environ['OZOW_CLIENT_SECRET']

app = FastAPI()

async def get_access_token(scope: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{OZOW_BASE_URL}/token",
            data={
                'client_id': OZOW_CLIENT_ID,
                'client_secret': OZOW_CLIENT_SECRET,
                'scope': scope,
                'grant_type': 'client_credentials',
            },
        )
        res.raise_for_status()
        return res.json()['access_token']

@app.post('/ozow/create-payment')
async def create_payment():
    token = await get_access_token('payment')
    payload = {
        'siteCode': 'SITE-001',
        'amount': {'currency': 'ZAR', 'value': 99.0},
        'merchantReference': 'ORDER-12345',
        'expireAt': '2025-12-31T23:59:59Z',
        'returnUrl': 'https://merchant.example.com/payment-return',
    }
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{OZOW_BASE_URL}/payments",
            headers={
                'Authorization': f"Bearer {token}",
                'Content-Type': 'application/json',
                'Idempotency-Key': str(uuid.uuid4()),
            },
            json=payload,
        )
        res.raise_for_status()
        return res.json()

@app.post('/ozow/webhook')
async def ozow_webhook(
    request: Request,
    svix_id: str | None = Header(default=None, alias='svix-id'),
    svix_timestamp: str | None = Header(default=None, alias='svix-timestamp'),
    svix_signature: str | None = Header(default=None, alias='svix-signature'),
):
    secret = os.environ['OZOW_WEBHOOK_SECRET']
    raw = await request.body()
    verifier = Webhook(secret)
    try:
        event = verifier.verify(
            raw.decode('utf-8'),
            {
                'svix-id': svix_id or '',
                'svix-timestamp': svix_timestamp or '',
                'svix-signature': svix_signature or '',
            },
        )
    except Exception:
        return Response(status_code=400)

    # TODO: dedupe using svix-id; then fetch authoritative status via Ozow APIs.
    return {'received': True, 'type': event.get('type')}
```

## 16. Appendix
### Glossary
- `One API`: Ozow’s unified REST API (Beta) at `https://one.ozow.com/v1`.
- `Basic API`: API-key authenticated subset at `https://one.ozow.com/v1/basic`.
- `Payment request`: resource created under `/payments` that yields a hosted `redirectUrl`.
- `Transaction`: payment execution attempt under `/transactions`.
- `Svix`: webhook delivery/verification platform used for Ozow webhooks.

### Key schema excerpts (OpenAPI)
### `TokenRequest`

TokenRequest

| Field | Type | Required | Description |
|---|---|---:|---|
| `client_id` | `string` | yes | The unique client id provided to the merchant during credential exchange. |
| `client_secret` | `string` | yes | The secret provided to the merchant during credential exchange. |
| `scope` | `string` | yes | The scope of permissions required. Can be just one or a list of space-delimited, case-sensitive strings. |
| `grant_type` | `string` | yes | Must be _client_credentials_. |

### `TokenResponse`

TokenResponse

| Field | Type | Required | Description |
|---|---|---:|---|
| `access_token` | `string` | yes | The access token issued by the authorization server. |
| `token_type` | `string` | yes | Must be `bearer` as in [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750). |
| `expires_in` | `string` | yes | The lifetime in seconds of the access token.  For example, the value "3600" denotes that the access token will expire in one hour from the time the response was generated. |
| `scope` | `string` | no | OPTIONAL, if identical to the scope requested by the client; otherwise, REQUIRED. |

### `PaymentRequest`

PaymentRequest

| Field | Type | Required | Description |
|---|---|---:|---|
| `siteCode` | `string` | yes | The merchant site code in use for this payment. Site codes are available on the Ozow dashboard. |
| `region` | `string` | no | ISO 3166-Alpha-2 code for the originating country of the payment.  Must be "ZA" for South Africa.    If region is not specified IP geolocation will be used to determine the applicable region. |
| `amount` | `Amount` | yes | The currency and amount of the payment request. |
| `amount.currency` | `string` | yes | The ISO 4217 current code. |
| `amount.value` | `number<float>` | yes | The amount in the currency specified. |
| `variableAmount` | `VariableAmount` | no | If the payment amount can be changed by the payer, the variable amounts need to be passed in. |
| `variableAmount.minimumValue` | `number<float>` | no | The minimum amount. |
| `variableAmount.maximumValue` | `number<float>` | no | The maximum amount. |
| `merchantReference` | `string` | yes | The merchant's reference for the transaction. |
| `beneficiaryReference` | `string` | no | The reference for the beneficiary. |
| `payerReference` | `string` | no |  |
| `payer` | `Payer` | no | Information on the payer used for identification and fraud purposes. |
| `payer.id` | `string` | no | The merchant identifier for the payer. |
| `payer.name` | `string` | no |  |
| `payer.identity` | `Identification` | no | The identity of a payer.  In high risk cases this information is required. |
| `payer.identity.type` | `string` | no | The type of identification for the person or business. Allowed values: said, passport, registration. |
| `payer.identity.country` | `string` | no | The ISO-3166-alpha-2 identifier for the country of identification. |
| `payer.identity.identifier` | `string` | no | The identifier for the consumer based on the identity type. |
| `payer.cellphone` | `string` | no | The cellphone number for the payer. |
| `payer.email` | `string<email>` | no | The email address of the payer. |
| `returnUrl` | `string<uri>` | no | The URI that Ozow needs to redirect back to once the payment has reached a conclusion. |
| `notifyUrl` | `string<uri>` | no | Optional notify URL to send notifications of the status of the payment. The recommendation is to use webhooks instead of this method which are configurable via the webhooks endpoints of the API or via the Ozow Dashboard. |
| `expireAt` | `string<date-time>` | yes | The date and time the payment request should expire at and make the payment link unusable |

### `PaymentResponse`

The payment request response.

| Field | Type | Required | Description |
|---|---|---:|---|
| `links` | `PaymentLinks` | yes | The relevant links to the this payment. |
| `links.self` | `string<uri>` | yes | The unique URI for this resource. |
| `links.cancel` | `string<uri>` | yes | The cancel URI for this payment.  This is a `POST` operation. |
| `links.transactions` | `string<uri>` | yes | The transactions associated with this payment request. |
| `id` | `string<uuid>` | yes | The identifier for the payment request. |
| `status` | `PaymentStatus` | yes | The status of the payment. |
| `reason` | `string` | no | The payment status reason. |
| `redirectUrl` | `string<uri>` | no | The url to redirect a consumer to.  A redirect url will be provided should a payment require further client interaction. |

### `TransactionRequest`

TransactionRequest

| Field | Type | Required | Description |
|---|---|---:|---|
| `paymentRequest` | `PaymentRequest` | yes | The payment request details. |
| `paymentRequest.siteCode` | `string` | yes | The merchant site code in use for this payment. Site codes are available on the Ozow dashboard. |
| `paymentRequest.region` | `string` | yes | ISO 3166-Alpha-2 code for the originating country of the payment.  Must be "ZA" for South Africa.    If region is not specified IP geolocation will be used to determine the applicable region. |
| `paymentRequest.amount` | `Amount` | yes | The currency and amount of the payment request. |
| `paymentRequest.amount.currency` | `string` | yes | The ISO 4217 current code. |
| `paymentRequest.amount.value` | `number<float>` | yes | The amount in the currency specified. |
| `paymentRequest.variableAmount` | `VariableAmount` | yes | If the payment amount can be changed by the payer, the variable amounts need to be passed in. |
| `paymentRequest.variableAmount.minimumValue` | `number<float>` | yes | The minimum amount. |
| `paymentRequest.variableAmount.maximumValue` | `number<float>` | yes | The maximum amount. |
| `paymentRequest.merchantReference` | `string` | yes | The merchant's reference for the transaction. |
| `paymentRequest.beneficiaryReference` | `string` | yes | The reference for the beneficiary. |
| `paymentRequest.payerReference` | `string` | yes |  |
| `paymentRequest.payer` | `Payer` | yes | Information on the payer used for identification and fraud purposes. |
| `paymentRequest.payer.id` | `string` | yes | The merchant identifier for the payer. |
| `paymentRequest.payer.name` | `string` | yes |  |
| `paymentRequest.payer.identity` | `Identification` | yes | The identity of a payer.  In high risk cases this information is required. |
| `paymentRequest.payer.cellphone` | `string` | yes | The cellphone number for the payer. |
| `paymentRequest.payer.email` | `string<email>` | yes | The email address of the payer. |
| `paymentRequest.returnUrl` | `string<uri>` | yes | The URI that Ozow needs to redirect back to once the payment has reached a conclusion. |
| `paymentRequest.notifyUrl` | `string<uri>` | yes | Optional notify URL to send notifications of the status of the payment. The recommendation is to use webhooks instead of this method which are configurable via the webhooks endpoints of the API or via the Ozow Dashboard. |
| `paymentRequest.expireAt` | `string<date-time>` | yes | The date and time the payment request should expire at and make the payment link unusable |
| `paymentDetail` | `PaymentDetail` | no |  |
| `paymentDetail.paymentType` | `string` | no | The payment type being made. To redirect to Ozow with a specific institution pre-selected please use the `ozowredirect` type.   Except for the `ozowredirect` payment type, all the other listed options require implementation of a callback url to handle responses and requests for more information to complete processing.  Payment types such as `absapay`, `card` and `payshap` have pre-requisites that must be met and may not be available for particular payments and amounts. Allowed values: ozowredirect, absapay, bankdeposit, card, nedbankdirecteft, ozowwallet, payshap, voucher. |
| `paymentDetail.details` | `oneOf` | no |  |

### `Transaction`

Transaction

| Field | Type | Required | Description |
|---|---|---:|---|
| `links` | `TransactionLinks` | no |  |
| `links.self` | `string<uri>` | no | The unique URI for this resource. |
| `links.refund` | `string<uri>` | no | The refund operation for this transaction.  This is a `POST` operation. |
| `id` | `string<uuid>` | yes | The transaction id of the payment. |
| `amount` | `Amount` | no | The amount that was requested. |
| `amount.currency` | `string` | no | The ISO 4217 current code. |
| `amount.value` | `number<float>` | no | The amount in the currency specified. |
| `merchantReference` | `string` | yes | The merchant's reference for the transaction. |
| `siteCode` | `string` | yes | The merchant site code in use for this payment. |
| `institution` | `string` | yes | The institution for the transaction. |
| `status` | `TransactionStatus` | yes | The status of the transaction. |
| `reason` | `string` | no | Payment status reason. |
| `createdDate` | `string<date-time>` | yes | The date the transaction was created. |
| `completedDate` | `string<date-time>` | no | The date the transaction was completed. |

### `RefundRequest`

RefundRequest

| Field | Type | Required | Description |
|---|---|---:|---|
| `transactionId` | `string<uuid>` | yes |  |
| `amount` | `Amount` | yes | The amount that needs to be refunded. This can be less than the original transaction amount but not more.  Note that only up to the transaction amount can be refunded. |
| `amount.currency` | `string` | yes | The ISO 4217 current code. |
| `amount.value` | `number<float>` | yes | The amount in the currency specified. |
| `reason` | `string` | yes | The reason for the refund. |
| `notifyUrl` | `string<uri>` | no | Optional notify URL to send notifications of the status of the refund. The recommendation is to use webhooks instead of this method which are configurable via the webhooks endpoints of the API. |
| `realTimePayment` | `boolean` | yes | Whether or not this payment should happen in real time. Please refer to the [Ozow Pricing](https://ozow.com/pricing) page for more information. |

### `Refund`

Refund

| Field | Type | Required | Description |
|---|---|---:|---|
| `links` | `object` | yes | Links related to this resource. |
| `links.self` | `string<uri>` | yes | The unique URI to this resource. |
| `links.cancel` | `string` | yes |  |
| `id` | `string<uuid>` | yes | The unique identifier for this refund. |
| `transactionId` | `string<uuid>` | yes | The transactions identifier of the payment that is being refunded. |
| `amount` | `Amount` | yes | The refund amount. |
| `amount.currency` | `string` | yes | The ISO 4217 current code. |
| `amount.value` | `number<float>` | yes | The amount in the currency specified. |
| `requested` | `string<date-time>` | yes | The date and time the refund was requested. |
| `completed` | `string<date-time>` | no | The date and time the refund was completed. |
| `status` | `string` | yes | The refund status.  Possible values are:   * pending - The refund request has been submitted and accepted. * complete - The refund has been paid successfully. * submitted - The refund has been assigned to a batch and is being processed. * failed - The refund payment has failed. * cancelled - The refund has been cancelled before it was submitted. * returned - The refund payment has been returned because the account that was being refunded no longer exists.  Allowed values: pending, complete, submitted, failed, cancelled, returned. |
| `reason` | `string` | no | The reason for the status of the refund. |
| `paidTo` | `BankAccount` | no | The bank details of where the refund was paid to. |
| `paidTo.insitutionId` | `string<uuid>` | no | The unique identifier of the institution. |
| `paidTo.institutionName` | `string` | no | The name of the institution. |
| `paidTo.accountNumber` | `string` | no | The bank account number. |
| `paidTo.branchCode` | `string` | no | The branch code of the account. |
| `realTimePayment` | `boolean` | yes | Whether or not this payment should happen in real time. Please refer to the [Ozow Pricing](https://ozow.com/pricing) page for more information. |

### `Settlement`

The settlement summary information.

| Field | Type | Required | Description |
|---|---|---:|---|
| `links` | `object` | yes | Links related to this resource. |
| `links.self` | `string<uri>` | yes | The unique URI to this resource. |
| `links.lineItems` | `string<uri>` | yes | The URI to list the line items associated with this settlement. |
| `id` | `string<uuid>` | yes | The unique id for this settlement. |
| `totalSettlement` | `Amount` | yes | The total amount being settled. |
| `totalSettlement.currency` | `string` | yes | The ISO 4217 current code. |
| `totalSettlement.value` | `number<float>` | yes | The amount in the currency specified. |
| `totalFees` | `Amount` | yes | The total fees deducted from all corresponding transactions before calculating the settlement amount. The fees for each line item record may not add up to this fee because of rounding and this fee will be calculated off total amounts or counts. |
| `totalFees.currency` | `string` | yes | The ISO 4217 current code. |
| `totalFees.value` | `number<float>` | yes | The amount in the currency specified. |
| `lineItemCounts` | `object` | yes | The line item counts for each type available. |
| `lineItemCounts.total` | `number` | yes | The total number of line items in the settlement. |
| `lineItemCounts.transaction` | `number` | yes | The number of transaction line items in the settlement. |
| `lineItemCounts.refund` | `number` | yes | The number of refund line items in the settlement. |
| `lineItemCounts.adjustment` | `number` | yes | The number of adjustment line items in the settlement. |
| `lineItemCounts.payout` | `number` | yes | The number of payout line items in the settlement. |
| `reference` | `string` | yes | The unique settlement reference that will be present in the reference on your bank statement. |
| `date` | `string<date>` | yes | The UTC date the settlement was created. |
| `bank` | `BankAccount` | no |  |
| `bank.insitutionId` | `string<uuid>` | no | The unique identifier of the institution. |
| `bank.institutionName` | `string` | no | The name of the institution. |
| `bank.accountNumber` | `string` | no | The bank account number. |
| `bank.branchCode` | `string` | no | The branch code of the account. |

### `SettlementLineItem`

SettlementLineItem

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | `string<uuid>` | yes | The unique identifier for this record. |
| `siteCode` | `string` | yes | A unique code for the Ozow site this record relates to. |
| `reference` | `string` | yes | The merchant’s reference for the record (transaction, refund or payout). Ozow will generate a reference for adjusts where applicable. |
| `description` | `string` | no | The description of the line item, this will be populated primarily on adjustment line items. |
| `amount` | `Amount` | yes | The original amount for the record. |
| `amount.currency` | `string` | yes | The ISO 4217 current code. |
| `amount.value` | `number<float>` | yes | The amount in the currency specified. |
| `fee` | `Amount` | yes | The Ozow fee relating to the record. Fee for the record is rounded. |
| `fee.currency` | `string` | yes | The ISO 4217 current code. |
| `fee.value` | `number<float>` | yes | The amount in the currency specified. |
| `settlementAmount` | `Amount` | yes | The nett settlement amount for this record. Amount – Fee, only rounded after calculating. |
| `settlementAmount.currency` | `string` | yes | The ISO 4217 current code. |
| `settlementAmount.value` | `number<float>` | yes | The amount in the currency specified. |
| `date` | `string<date>` | yes | The UTC date the record applies to. |
| `type` | `string` | yes | The line type for the record. Allowed values: transaction, refund, payout, adjustment, returnedrefund, returnedpayout, fee, chargebackwithheld, reservewithheld, chargebackreleased, reservereleased. |

### `WebhookRequest`

WebhookRequest

| Field | Type | Required | Description |
|---|---|---:|---|
| `endpoint` | `string<uri>` | yes | The uri of the webhook receiver. |
| `eventType` | `string` | yes | The type of event the webhook subscribes to. Allowed values: transaction.complete, refund.complete. |
| `messageType` | `string` | no | Defaults to `thin`. Specify `full` to receive a larger payload with as much detail as possible. Allowed values: thin, full. |

### `WebhookResponse`

WebhookResponse

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | `string<uuid>` | yes | The unique identifier of the webhook. |
| `endpoint` | `string<uri>` | yes | The uri of the webhook receiver. |
| `eventType` | `string` | yes | The type of event the webhook subscribes to. Allowed values: transaction.complete, refund.complete. |
| `messageType` | `string` | yes | Defaults to `thin`. Specify `full` to receive a larger payload with as much detail as possible. Allowed values: thin, full. |

### `WebhookSecretResponse`

WebhookSecretResponse

| Field | Type | Required | Description |
|---|---|---:|---|
| `secret` | `string` | yes | The secret key of the webhook to be used when validating the webhook signature. |

### `Error`

A standard [JSON API error](https://jsonapi.org/format/#errors)

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | `string` | yes | a unique identifier for this particular occurrence of the problem. |
| `links` | `object` | no |  |
| `links.about` | `string<uri>` | no | A link that leads to further details about this particular occurrence of the problem. When derefenced, this URI SHOULD return a human-readable description of the error. |
| `links.type` | `string<uri>` | no | A link that identifies the type of error that this particular error is an instance of. This URI SHOULD be dereferencable to a human-readable explanation of the general error. |
| `code` | `string` | yes | An application-specific error code, expressed as a string value. |
| `title` | `string` | yes | A short, human-readable summary of the problem that SHOULD NOT change from occurrence to occurrence of the problem, except for purposes of localization. |
| `detail` | `string` | yes | A human-readable explanation specific to this occurrence of the problem. Like title, this field’s value can be localized. |
| `source` | `anyOf` | no |  |
| `meta` | `object` | no | A [meta object](https://jsonapi.org/format/#document-meta) containing non-standard meta-information about the error. |

### Full list of crawled URLs (with depth)
- depth 0: https://hub.ozow.com/docs/one-api/u9dgo2smpkkz3-overview
- depth 1: https://hub.ozow.com/docs/one-api
- depth 2: https://hub.ozow.com/docs/one-api/0au7oi4177yp1-webhooks
- depth 2: https://hub.ozow.com/docs/one-api/0cpheyi908oy5-direct-payments-advanced-feature
- depth 2: https://hub.ozow.com/docs/one-api/0fd0fd9234b63-authentication
- depth 2: https://hub.ozow.com/docs/one-api/4mfxtbejykceo-bank-account-verification-services
- depth 2: https://hub.ozow.com/docs/one-api/6sdgrgaftqdix-one-api
- depth 2: https://hub.ozow.com/docs/one-api/9j3xvyjio4xjc-one-api-basic
- depth 2: https://hub.ozow.com/docs/one-api/9wl8fc3a5qe92-web-sockets
- depth 2: https://hub.ozow.com/docs/one-api/be561bda5c46d-webhooks
- depth 2: https://hub.ozow.com/docs/one-api/d2ff05889cebe-versioning
- depth 2: https://hub.ozow.com/docs/one-api/e082beb550e68-idempotency
- depth 2: https://hub.ozow.com/docs/one-api/fbc01bdf1acdd-responses
- depth 2: https://hub.ozow.com/docs/one-api/hl95up5kkviui-settlements-api
- depth 2: https://hub.ozow.com/docs/one-api/s4uv3lc09li38-best-practices
- depth 2: https://hub.ozow.com/docs/one-api/tov45lvu4ik2p-refunds
- depth 2: https://hub.ozow.com/docs/one-api/yu4y4luah3arn-quickstart-payments
- depth 3: https://hub.ozow.com/docs/one-api/8kzshry4ebjhw-refund
- depth 3: https://hub.ozow.com/docs/one-api/reference/OneAPI.yaml/paths/~1webhooks/get
- depth 3: https://hub.ozow.com/docs/one-api/reference/OneAPI.yaml/paths/~1webhooks~1%7Bid%7D~1secret/get
- depth 4: https://hub.ozow.com/docs/one-api/2h2hh93egnwlo-replay-failed-messages
- depth 4: https://hub.ozow.com/docs/one-api/4r22mlk5skhnx-list-webhook-subscriptions
- depth 4: https://hub.ozow.com/docs/one-api/895p40w04c2p2-request-refunds
- depth 4: https://hub.ozow.com/docs/one-api/acllrqbezj4c6-list-refunds
- depth 4: https://hub.ozow.com/docs/one-api/af0dlw5ke4xl2-get-refund-notifications
- depth 4: https://hub.ozow.com/docs/one-api/bkgsrq5r98hqd-get-refund
- depth 4: https://hub.ozow.com/docs/one-api/e4gfh6nlidpaj-get-webhook-secret
- depth 4: https://hub.ozow.com/docs/one-api/f3f3n5otz2bcs-webhook-response
- depth 4: https://hub.ozow.com/docs/one-api/fpwc2y6asf445-get-webhook-subscription
- depth 4: https://hub.ozow.com/docs/one-api/i4a21t97lllq4-webhook-message-status
- depth 4: https://hub.ozow.com/docs/one-api/k7miafv3frqde-refund-request
- depth 4: https://hub.ozow.com/docs/one-api/ko4noxljgvoxa-webhook-secret-response
- depth 4: https://hub.ozow.com/docs/one-api/mrzoxcr7ihx2s-webhook-request
- depth 4: https://hub.ozow.com/docs/one-api/peb3biq5wv8mn-create-webhook-subscription
- depth 4: https://hub.ozow.com/docs/one-api/q6c4s4b6xu3ev-refund-list
- depth 4: https://hub.ozow.com/docs/one-api/ryb11ikbzmydo-cancel-refund
- depth 4: https://hub.ozow.com/docs/one-api/un6fzhzdovomq-delete-webhook-subscription
- depth 4: https://hub.ozow.com/docs/one-api/uxlpsh4j7yvv6-resend-refund-notifications
- depth 4: https://hub.ozow.com/docs/one-api/uzjdhqx60dtc4-update-webhook-subscription
- depth 4: https://hub.ozow.com/docs/one-api/xvxu95si2luq2-transaction-refund-request

### Downloadable spec links (OpenAPI/Postman/SDK)
- One API reference viewer: https://hub.ozow.com/reference/OneAPI.yaml (use `Export → Bundled References` to download OpenAPI YAML).
- One API - Basic reference viewer: https://hub.ozow.com/reference/OneAPIBasic.yaml (use `Export → Bundled References` to download OpenAPI YAML).
