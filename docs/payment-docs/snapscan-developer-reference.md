# SnapScan Developer Reference (Integration-Focused)

## 1. Scope and Audience

- Covers the SnapScan QR-code-based payment collection flow, Merchant API, and webhook delivery/signing as documented at `https://developer.getsnapscan.com/`.
- Excludes marketing pages and undocumented integration surfaces (e.g. refunds) unless explicitly referenced by the docs.
- Intended reader: AI coding agents integrating SnapScan into existing application platforms.

## 2. Canonical Sources and Versioning

- Docs base URL: `https://developer.getsnapscan.com/`
- Start URL (docs anchor): `https://developer.getsnapscan.com/#overview`
- API versioning observed in docs:
  - Merchant API base includes path versioning: `https://pos.snapscan.io/merchant/api/v1/...`
  - No additional version headers documented.
- Key pages used:
  - `https://developer.getsnapscan.com/#authentication`
  - `https://developer.getsnapscan.com/#webhook`
  - `https://developer.getsnapscan.com/#qr-codes`
  - `https://developer.getsnapscan.com/#payments`
  - `https://developer.getsnapscan.com/#cash-ups`
  - `https://developer.getsnapscan.com/#error-codes`
  - `https://developer.getsnapscan.com/#pagination`
  - `https://developer.getsnapscan.com/#rate-limiting`

## 3. Quick Integration Summary (One Page)

1) Obtain from SnapScan:
   - A merchant **SnapCode** (for QR URLs).
   - A Merchant API **API key** (HTTP Basic Auth).
   - (Optional but recommended) a webhook endpoint configured by SnapScan + **Webhook Authentication Key**.

2) Generate a payment URL (customer scans it):
   - Base: `https://pos.snapscan.io/qr/{snapCode}`
   - Optional: `id` (merchant reference) and `amount` (cents) and `strict=true`
   - Optional: arbitrary extra query parameters (returned as `payment.extra`)

3) Display a QR image:
   - `https://pos.snapscan.io/qr/{snapCode}.svg?...&snap_code_size=125` (or `.png`)

4) Receive payment completion:
   - Prefer webhook: SnapScan `POST`s **completed** and **errored** payment objects to your configured URL.
   - Verify webhook authenticity:
     - Compute HMAC-SHA256 hexdigest of the **raw URL-encoded body** using the Webhook Authentication Key.
     - Compare to `Authorization: SnapScan signature=<hash>` using constant-time compare.

5) Persist/reconcile:
   - Use Merchant API to query status when needed:
     - `GET https://pos.snapscan.io/merchant/api/v1/payments`
     - `GET https://pos.snapscan.io/merchant/api/v1/payments/{id}`
   - For reconciliation by periods:
     - `POST https://pos.snapscan.io/merchant/api/v1/cash_ups` → returns `{date, reference}`
     - `GET https://pos.snapscan.io/merchant/api/v1/payments/cash_ups/{reference}`

If you only read one section, read this: implement QR URL creation + webhook verification + “manual refresh” polling via `GET /payments`.

## 4. Core Concepts and Objects

### SnapCode

- A merchant identifier embedded in every SnapScan QR code.
- Used in QR URLs: `https://pos.snapscan.io/qr/{snapCode}`.

### Payment URL parameters → payment fields

- `amount` (in cents; examples show `amount=1000` for R10.00) maps to `payment.requiredAmount`.
- `id` (merchant-provided reference) maps to `payment.merchantReference`.
- Arbitrary extra query parameters map to `payment.extra` (object), e.g. `customValue=123`.
- `strict=true` modifies payment acceptance rules (see “strict” below).

### Payment object (Merchant API + webhook payload)

- A JSON object with all possible attributes; if not defined it will be `null` (docs statement).
- Key identifiers/states:
  - `id` (integer): SnapScan sequential payment id.
  - `status` (string): one of `completed`, `error`, `pending`.
  - `date` (string): UTC ISO8601 start time of payment.

**Example payment object (docs)**

```json
{
  "id": 1,
  "status": "completed",
  "date": "1999-12-31T23:00:00Z",
  "totalAmount": 1000,
  "tipAmount": 0,
  "requiredAmount": 1000,
  "snapCode": "STB115",
  "snapCodeReference": "Till Point #1",
  "userReference": "John Doe",
  "merchantReference": "INV001",
  "statementReference": "SNAPSCAN 20150109",
  "authCode": "123456",
  "isVoucher": false,
  "isVoucherRedemption": false,
  "extra": {
    "customValue": "123"
  },
  "deviceSerialNumber": "R28K10HBQTX",
  "transactionType": "payment"
}
```

**Fields (docs)**

| Attribute | Type | Description |
| --- | --- | --- |
| `id` | Integer | Our unique ID for the payment. The ID is sequential and starts from `1`. |
| `status` | String | Indicates whether the payment was successful or failed. Possible values: `completed`, `error`, `pending`. |
| `date` | String | UTC date of when the payment was started (ISO8601), e.g. `1999-12-31T23:00:00Z`. |
| `totalAmount` | Integer | Total amount in cents paid by the user. |
| `tipAmount` | Integer | If enabled for your account, includes tip amount in cents paid by the user (`totalAmount` includes `tipAmount`). |
| `snapCode` | String | Unique reference encoded in the QR code linked to your account; always the same for payments made through the QR. |
| `snapCodeReference` | String | Reference optionally defined on the QR code; always the same for payments made through it. |
| `userReference` | String | If enabled for your account, includes the reference defined by the user when making the payment. |
| `statementReference` | String | If settled into your bank account, includes the statement reference for the associated settlement (appears on your bank statement). |
| `isVoucher` | Boolean | Indicates whether a voucher was purchased for this payment. |
| `isVoucherRedemption` | Boolean | Indicates whether a voucher was used to perform this payment. |
| `deviceSerialNumber` | String | Unique serial number of the card terminal used to make the payment. |
| `transactionType` | String | Transaction type of the payment; can be `payment` or `refund`. |
| `extra` | Object | Any extra parameters sent as part of the payment URL. |

**Fields returned when QR URL parameters are used (docs)**

| Attribute | Type | Description |
| --- | --- | --- |
| `requiredAmount` | Integer | The amount in cents that was required to be paid by the user. |
| `merchantReference` | String | A unique reference defined by you and encoded in the QR code. |
| `authCode` | String | A random 6-digit number generated for payments that have `requiredAmount` and `merchantReference` defined; displayed to the user if payment was successful. |

### Cash up (transaction period reference)

- A “cash up period” is a transaction period boundary created via the API.
- A cash up reference can be used to retrieve all payments completed successfully in the associated period.

**Cash up object (docs)**

```json
{
  "date": "1999-12-31T23:00:00Z",
  "reference": "ab34Def78"
}
```

| Attribute | Type | Description |
| --- | --- | --- |
| `date` | String | UTC date of when the transaction period was ended (ISO8601), e.g. `1999-12-31T23:00:00Z`. |
| `reference` | String | Hexadecimal string with a maximum length of 32. |

### “pending” behaviour

- Docs note credit card processing can take a few seconds.
- If queries contain pending payments, integrations may need to poll until a final state is available.
- Webhook recommended for real-time; integrations should still allow clients to request status manually (docs guidance).

## 5. Environments, Credentials, and Access

### Environments

- Merchant API host in docs: `https://pos.snapscan.io/merchant/api/v1/...`
- QR host in docs: `https://pos.snapscan.io/qr/...`
- UNKNOWN (docs did not specify): sandbox/staging hosts, test SnapCodes, test payment simulation, or environment separation.

### Credentials and where to obtain them

- Merchant API access is “protected through an API key”.
- Webhook delivery requires configuration during account set up (SnapScan configures the URL).
- UNKNOWN (docs did not specify): self-serve dashboard flow to create/revoke API keys or webhook keys.

### Operational prerequisites

- All requests must be HTTPS.
- UNKNOWN (docs did not specify): IP allowlisting, certificate pinning, mTLS, or webhook source IP ranges.

## 6. Authentication and Authorisation

### Merchant API authentication

- Mechanism: HTTP Basic Auth.
- Username: your API key.
- Password: blank/empty.
- Example from docs:

```sh
# Authentication through HTTP Basic Auth
curl -u your-api-key: "api_endpoint_here"
```

- HTTPS required; HTTP requests fail (docs statement).
- Unauthorised response example (docs):

```http
HTTP/1.1 401 UNAUTHORIZED
Content-Type: application/json

{
  "message": "Unauthorised"
}
```

### Webhook authenticity

- Webhook signature is sent in the HTTP `Authorization` header in this form:
  - `SnapScan signature=<hash>`
- `<hash>` is computed as:
  - `HMAC_SHA256_HEX(raw_request_body, webhook_auth_key)`
- Critically: signature is computed over the **raw request body** (the original URL-encoded body including the `payload` key), not over the parsed JSON payload.
- Constant-time string comparison recommended (docs mention `secure_compare` in Ruby).

## 7. Payment Flows

### 7.1 Standard QR payment collection

**Purpose**
- Collect a customer payment by having the customer scan a SnapScan QR code.

**Preconditions**
- Merchant has a SnapCode.
- Your platform can render or display a QR code URL or image.

**Sequence**
1) Build a payment URL:
   - Base: `https://pos.snapscan.io/qr/{snapCode}`
2) Optionally append query parameters:
   - `id` for your order/invoice reference (becomes `merchantReference`).
   - `amount` in cents (becomes `requiredAmount`).
   - `strict=true` to restrict duplicate/underpayments (docs statement).
   - Any extra query params (become `extra`).
3) Display the URL as a link and/or render a QR image:
   - `.svg` or `.png` variant; include `snap_code_size` if desired.
4) Receive payment completion:
   - Via webhook (recommended) and/or poll Merchant API for status.

**Concrete URL examples (docs)**
- Standard SnapCode:
  - `https://pos.snapscan.io/qr/shopalot`
- With id + amount:
  - `https://pos.snapscan.io/qr/shopalot?id=Ord123&amount=1000`
- With strict:
  - `https://pos.snapscan.io/qr/shopalot?id=Ord123&amount=1000&strict=true`
- Extra parameters:
  - `https://pos.snapscan.io/qr/shopalot?customValue=123`

**Edge cases**
- If you rely only on webhooks, allow manual status refresh; webhooks can fail due to timeouts (docs statement).
- If you depend on `strict=true`, ensure your UX explains the constraints (duplicate payment/underpayment prevention). UNKNOWN (docs did not specify): the exact failure mode presented to the customer.

### 7.2 QR code image generation (rendering)

**Purpose**
- Render a scannable QR image for a payment URL.

**Preconditions**
- A valid payment URL (or SnapCode plus parameters).

**Mechanism (docs)**
- Image endpoint is the QR URL with an image extension and optional size parameter:
  - `https://pos.snapscan.io/qr/{snapCode}.svg?...&snap_code_size=125`
  - `https://pos.snapscan.io/qr/{snapCode}.png?...&snap_code_size=125`

**Example (docs)**

```html
<a href="https://pos.snapscan.io/qr/shopalot?id=Ord123&amount=1000">
  <img src="https://pos.snapscan.io/qr/shopalot.svg?id=Ord123&amount=1000&snap_code_size=125">
</a>
```

**Rules (docs)**
- `snap_code_size` can be between `50` and `500` (defaults to `125`).
- Image type can be either `.svg` or `.png`.
- “The image type and size parameters are stripped from the generated QR code” (docs statement): they affect rendering only, not payment data.
- Do not set `width`/`height` attributes on the `<img>` tag because it distorts the QR code (docs notice).

### 7.3 Payment status retrieval (polling)

**Purpose**
- Retrieve status for payments made against your QR codes (SnapCodes).

**Preconditions**
- Merchant API API key.

**Sequence**
1) Query by time range or by references (recommended: use your `merchantReference` via `id` param in the QR URL).
2) If any returned payments are `pending`, poll again after a short delay (docs note pending can occur).
3) For higher certainty when webhooks are used, re-check with authenticated `GET /payments/{id}` (docs warning: treat webhooks as unauthenticated stream).
4) If you encounter `transactionType=refund` in responses, note that the docs do not describe refund creation/query endpoints; treat as read-only surface unless/until SnapScan provides additional API documentation.

### 7.4 Reconciliation via cash ups

**Purpose**
- Mark a transaction period boundary and query all successfully completed payments in that period.

**Preconditions**
- Merchant API API key.

**Sequence**
1) Create a cash up reference:
   - `POST https://pos.snapscan.io/merchant/api/v1/cash_ups`
2) Fetch payments for that cash up reference:
   - `GET https://pos.snapscan.io/merchant/api/v1/payments/cash_ups/{reference}`
3) If the cash up period contains any pending payments:
   - API returns HTTP `500` and you should wait a couple of seconds then retry (docs guidance).

## 8. Callbacks, Webhooks, and Event Handling

### Delivery

- Webhook URL is configured during account set up (SnapScan configures a URL for you).
- SnapScan `POST`s payment objects “as we determine their status”.
- Only **completed** and **errored** payments are sent via webhook (docs statement).
- Content type: `application/x-www-form-urlencoded`.
- Body shape: JSON string under the form key `payload`.
  - Example conceptual body: `payload={...json...}` (URL-encoded).

### Required response and retries

- Your endpoint must return `HTTP 200`. Response body is ignored (docs statement).
- If SnapScan does not receive `HTTP 200`, it retries multiple times over a period of 3 minutes (docs statement).
- UNKNOWN (docs did not specify): exact retry schedule, max attempts, and whether retries are per-event idempotent.

### Signature verification (exact)

1) Read the **raw request body** bytes exactly as received (before decoding).
2) Compute HMAC-SHA256 hexdigest over that raw body using your Webhook Authentication Key.
3) Build expected header value:
   - `SnapScan signature=<computed_hex>`
4) Compare to the received `Authorization` header using constant-time comparison.

### Handling and idempotency

- Treat webhooks as an unauthenticated event stream; verify signature and, if payment spoofing is a concern, re-check with authenticated API call (docs recommendation).
- Recommended idempotency strategy (best practice; not in docs):
  - De-duplicate by `payment.id` (sequential integer) and/or by your own `merchantReference` (`id` query parameter) if stable and unique.

## 9. API Reference (Consolidated)

### 9.1 QR URLs (payment initiation)

**Payment URL**
- Method + path: `GET https://pos.snapscan.io/qr/{snapCode}`
- Auth: none (public).
- Query parameters (docs):
  - `amount` (integer): required amount in cents (maps to `requiredAmount`).
  - `id` (string): merchant reference (maps to `merchantReference`).
  - `strict` (boolean-ish): `true` supported; restricts duplicate/underpayments.
  - `...` (any extra query params): returned as `payment.extra`.
- Response: not specified; intended for customers to open/scan.
- Errors: UNKNOWN (docs did not specify).

**QR image**
- Method + path: `GET https://pos.snapscan.io/qr/{snapCode}.{svg|png}`
- Auth: none (public).
- Query parameters:
  - All payment URL parameters above.
  - `snap_code_size` (integer): 50–500, default 125 (rendering only).
- Response: an image.

### 9.2 Merchant API base

- Base URL: `https://pos.snapscan.io/merchant/api/v1`
- Auth: HTTP Basic Auth (`username=API_KEY`, blank password).
- Content type: `application/json` (examples show JSON responses; errors return JSON object with `message`).
- Pagination: supported on “resources that can return multiple records” (docs statement).

**Pagination parameters (docs)**

| Parameter | Default | Description |
| --- | --- | --- |
| `page` | `1` | The current page. |
| `perPage` | `50` | The number of records to return per page (maximum: `100`). |
| `offset` | `0` | The offset to start from. |

**Pagination response headers (docs)**

| Header | Description |
| --- | --- |
| `X-Total` | The total number of records in the query. |
| `X-Total-Pages` | The number of pages that the query is made up of. |
| `X-Page` | The current page. |
| `X-Per-Page` | The number of records per page. |
| `X-Next-Page` | The next page. |
| `X-Prev-Page` | The prev page. |
| `X-Offset` | The offset being used. |

### 9.3 Payments

**List payments**
- Name: Get all payments
- Method + path: `GET /payments`
- Full URL: `https://pos.snapscan.io/merchant/api/v1/payments`
- Auth: required.
- Query parameters (all optional; docs):
  - `startDate` (string, ISO8601 UTC): payments started at or after this time.
  - `endDate` (string, ISO8601 UTC): payments started before this time.
  - `status` (string): comma-separated values from `completed`, `error`, `pending` (e.g. `completed,pending`).
  - `snapCode` (string): filter by SnapCode.
  - `snapCodeReference` (string)
  - `userReference` (string)
  - `merchantReference` (string)
  - `statementReference` (string)
  - Pagination params: `page`, `perPage` (max 100), `offset`.
- Response:
  - `200`: JSON array of payment objects, ordered by descending `id`.
  - Pagination headers included (see Section 9.2).
- Error cases:
  - `400`: invalid parameter → `{ "message": "..." }`
  - `401`: unauthorised → `{ "message": "Unauthorised" }` (example shown under auth)
  - `429`: throttled (rate limiting)

**Query parameters (docs table)**

| Parameter | Description |
| --- | --- |
| `startDate` | Payments that were started at or after this time, e.g. `2000-01-01T01:00:00Z`. |
| `endDate` | Payments that were started before this time, e.g. `2000-01-01T01:00:00Z`. |
| `status` | Comma separated string of: `completed`, `error`, `pending`, e.g. `completed,pending`. |
| `snapCode` | Payments with the SnapCode. |
| `snapCodeReference` | Payments with the SnapCode reference. |
| `userReference` | Payments with the user reference. |
| `merchantReference` | Payments with your reference. |
| `statementReference` | Payments included in the settlement with the provided reference. |

**Response codes (docs table)**

| Description | HTTP Status | JSON Response |
| --- | --- | --- |
| OK | 200 | Array of payment objects |
| Invalid parameter | 400 | Object containing a `message` key |

**Get payment**
- Name: Get a payment
- Method + path: `GET /payments/{id}`
- Full URL: `https://pos.snapscan.io/merchant/api/v1/payments/{id}`
- Auth: required.
- Path parameters:
  - `id` (integer): sequential payment id.
- Response:
  - `200`: a payment object.
- Error cases:
  - `404`: id doesn't exist → `{ "message": "..." }`
  - `401`, `429` as above.

**Route parameters (docs table)**

| Parameter | Description |
| --- | --- |
| `id` | The sequential ID of the payment. |

**Response codes (docs table)**

| Description | HTTP Status | JSON Response |
| --- | --- | --- |
| OK | 200 | A payment object |
| ID doesn't exist | 404 | Object containing a `message` key |

**List payments for cash up**
- Name: Get all cash up payments
- Method + path: `GET /payments/cash_ups/{reference}`
- Full URL: `https://pos.snapscan.io/merchant/api/v1/payments/cash_ups/{reference}`
- Auth: required.
- Path parameters:
  - `reference` (string): cash up reference.
- Response:
  - `200`: array of payment objects for the cash up period (docs: “completed successfully”).
- Error cases:
  - `404`: reference doesn't exist → `{ "message": "..." }`
  - `500`: cash up contains pending payments → `{ "message": "The query is not ready yet because the specified cash up period contains pending payments, please try again in a moment." }` (docs example)

**Route parameters (docs table)**

| Parameter | Description |
| --- | --- |
| `reference` | The cash up period's reference. |

**Response codes (docs table)**

| Description | HTTP Status | JSON Response |
| --- | --- | --- |
| OK | 200 | Array of payment objects |
| Reference doesn't exist | 404 | Object containing a `message` key |
| Pending payments | 500 | Object containing a `message` key |

### 9.4 Cash ups

**Create cash up**
- Name: Create a cash up period
- Method + path: `POST /cash_ups`
- Full URL: `https://pos.snapscan.io/merchant/api/v1/cash_ups`
- Auth: required.
- Request body: none documented.
- Response:
  - `200`: a cash up object `{ date, reference }`.

**Response codes (docs table)**

| Description | HTTP Status | JSON Response |
| --- | --- | --- |
| OK | 200 | A cash up object |

**List cash ups**
- Name: Get all cash ups
- Method + path: `GET /cash_ups`
- Full URL: `https://pos.snapscan.io/merchant/api/v1/cash_ups`
- Auth: required.
- Query parameters: pagination params implied (docs: “paginated list”).
- Response:
  - `200`: array of cash up objects, ordered by descending date.

**Response codes (docs table)**

| Description | HTTP Status | JSON Response |
| --- | --- | --- |
| OK | 200 | An array of cash up objects |

## 10. Errors, Status Codes, and Troubleshooting

### Error model (docs)

- Valid error response is always a JSON object containing a `message` key.
- Status code categories:
  - `2xx`: success
  - `4xx`: request problem (missing/invalid parameters, unauthorised)
  - `5xx`: SnapScan server-side failure (or unable to service the request)

### Example error response (docs)

```http
HTTP/1.1 400 BAD REQUEST
Content-Type: application/json

{
  "message": "startDate is not valid"
}
```

### Common gotchas

- Webhooks:
  - Verify signature against the **raw URL-encoded body**, not the parsed JSON.
  - Return `HTTP 200` quickly; SnapScan retries non-200 responses for ~3 minutes (docs).
- Cash up payments endpoint:
  - `500` can mean “not ready yet” due to pending payments; retry after a couple seconds (docs).
- Pagination:
  - Read response pagination headers for total counts/pages (docs).

## 11. Security and Compliance Notes

- HTTPS required for API requests (docs statement).
- Webhooks “should be treated as an unauthenticated event stream” (docs statement); verify signature and optionally re-check via authenticated API call.
- UNKNOWN (docs did not specify): POPIA/PII handling guidance, retention requirements, or PCI scope notes.

## 12. Rate Limits, Performance, and Reliability

- Rate limiting:
  - API returns `429` when throttled (docs).
  - Exponential backoff recommended (docs).
  - UNKNOWN (docs did not specify): numeric limits, reset windows, or rate-limit headers.
- Payment finality:
  - Payments can remain `pending` briefly (docs).
  - Webhooks are recommended for real-time status; manual status checks should exist as fallback (docs).

## 13. Testing Strategy

- UNKNOWN (docs did not specify): sandbox environment, test SnapCodes, and how to simulate webhook events.
- Practical approach given documented surface:
  - Implement local webhook endpoint with signature verification and log payloads.
  - Use a real (non-test) flow in a controlled environment to observe payloads and status transitions.
  - Build unit tests for:
    - Basic-auth header construction.
    - Webhook signature verification (raw body + header parsing).
    - Query parameter encoding (merchantReference/id, amount in cents, strict flag).

## 14. Implementation Checklists

### Backend checklist

- Store `SNAPSCAN_API_KEY` (secret) and (if using webhook) `SNAPSCAN_WEBHOOK_AUTH_KEY` (secret).
- Implement Merchant API client:
  - Basic auth header (`username=API_KEY`, empty password).
  - Pagination support and backoff on `429`.
- Implement webhook handler:
  - Raw body capture.
  - HMAC-SHA256 verification.
  - Parse `payload` form key; JSON decode.
  - Idempotent processing keyed by `payment.id`.
- Implement “manual refresh”:
  - Query `GET /payments` by `merchantReference` and/or call `GET /payments/{id}` for certainty.

### Frontend checklist (if relevant)

- Generate payment URL with `id` and `amount` (cents).
- Render QR image via `.svg` or `.png` and `snap_code_size`.
- Avoid setting fixed `width`/`height` on `<img>` (docs notice).
- Provide “I’ve paid” / refresh affordance to poll status (docs recommendation for manual status request).

### Ops checklist

- Ensure webhook endpoint is publicly reachable via HTTPS.
- Monitor webhook endpoint availability and latency; treat non-200 as delivery failures (retries for ~3 minutes).
- Log signature failures and reject with non-200.
- Add alerting for repeated `429` responses and unexpected `5xx`.

## 15. Copy-Paste Integration Snippets

These snippets use only behaviour explicitly described in the docs. Where the docs are silent, comments label best-practice choices.

### 15.1 Node.js (TypeScript) — raw HTTP

```ts
import crypto from "node:crypto";

const SNAPSCAN_API_BASE = "https://pos.snapscan.io/merchant/api/v1";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function snapscanAuthHeader(apiKey: string): string {
  // HTTP Basic Auth: username=apiKey, password blank
  const token = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export async function listSnapScanPayments(params: {
  merchantReference?: string;
  status?: string; // e.g. "completed,pending"
  startDate?: string; // ISO8601 UTC
  endDate?: string; // ISO8601 UTC
  page?: number;
  perPage?: number;
}): Promise<unknown> {
  const apiKey = requireEnv("SNAPSCAN_API_KEY");

  const url = new URL(`${SNAPSCAN_API_BASE}/payments`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: snapscanAuthHeader(apiKey)
    }
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`SnapScan API error ${res.status}: ${bodyText}`);
  }

  return await res.json();
}

export function verifySnapScanWebhook(params: {
  rawBody: Buffer;
  authorizationHeader: string | null | undefined;
  webhookAuthKey: string;
}): boolean {
  if (!params.authorizationHeader) return false;

  const signatureHex = crypto
    .createHmac("sha256", params.webhookAuthKey)
    .update(params.rawBody)
    .digest("hex");

  const expected = `SnapScan signature=${signatureHex}`;
  const received = params.authorizationHeader;

  // Constant-time compare; reject if lengths differ.
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(received, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export function parseSnapScanWebhookPayload(rawBody: Buffer): unknown {
  // Docs: application/x-www-form-urlencoded with JSON string under the "payload" key.
  const form = new URLSearchParams(rawBody.toString("utf8"));
  const payload = form.get("payload");
  if (!payload) throw new Error("Missing form key: payload");
  return JSON.parse(payload) as unknown;
}
```

### 15.2 Python (FastAPI-style) — raw HTTP

```py
import hashlib
import hmac
import json
import os
from typing import Any, Dict, Optional
from urllib.parse import parse_qs

import httpx
from fastapi import FastAPI, Header, HTTPException, Request

app = FastAPI()

SNAPSCAN_API_BASE = "https://pos.snapscan.io/merchant/api/v1"


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing env var: {name}")
    return value


async def list_snapscan_payments(
    merchant_reference: Optional[str] = None,
    status: Optional[str] = None,
) -> Any:
    api_key = require_env("SNAPSCAN_API_KEY")
    auth = (api_key, "")  # HTTP Basic Auth: username=api_key, blank password

    params: Dict[str, str] = {}
    if merchant_reference:
        params["merchantReference"] = merchant_reference
    if status:
        params["status"] = status

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(f"{SNAPSCAN_API_BASE}/payments", params=params, auth=auth)
        if res.status_code >= 400:
            raise RuntimeError(f"SnapScan API error {res.status_code}: {res.text}")
        return res.json()


def verify_snapscan_webhook(raw_body: bytes, authorization: Optional[str], webhook_auth_key: str) -> None:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    digest = hmac.new(webhook_auth_key.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    expected = f"SnapScan signature={digest}"

    if not hmac.compare_digest(expected, authorization):
        raise HTTPException(status_code=401, detail="Invalid SnapScan signature")


@app.post("/webhooks/snapscan")
async def snapscan_webhook(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, str]:
    webhook_auth_key = require_env("SNAPSCAN_WEBHOOK_AUTH_KEY")

    raw_body = await request.body()  # raw URL-encoded body (docs: hash computed over this)
    verify_snapscan_webhook(raw_body=raw_body, authorization=authorization, webhook_auth_key=webhook_auth_key)

    form = parse_qs(raw_body.decode("utf-8"), keep_blank_values=True, strict_parsing=False)
    payload_values = form.get("payload")
    if not payload_values:
        raise HTTPException(status_code=400, detail="Missing form key: payload")

    payment = json.loads(payload_values[0])
    # BEST PRACTICE (not in docs): idempotent processing by payment["id"]
    # ...process payment...

    return {"ok": "true"}  # Docs: body ignored; must return HTTP 200
```

## 16. Appendix

### Glossary

- **SnapCode / SnapCode (SnapScan)**: Merchant identifier encoded in QR codes.
- **Payment URL**: `https://pos.snapscan.io/qr/{snapCode}[?...params]` scanned/opened by customers.
- **Merchant API**: Authenticated API for querying payment status: `https://pos.snapscan.io/merchant/api/v1/...`
- **Cash up**: A period boundary reference used to query payments for that period.

### Full list of crawled URLs (with depth)

- Depth 0: `https://developer.getsnapscan.com/#overview`
- Depth 1: `https://developer.getsnapscan.com/#api-overview`
- Depth 1: `https://developer.getsnapscan.com/#qr-codes`
- Depth 1: `https://developer.getsnapscan.com/#payments`
- Depth 1: `https://developer.getsnapscan.com/#cash-ups`
- Depth 1: `https://developer.getsnapscan.com/#code-snippets`
- Depth 2: `https://developer.getsnapscan.com/#authentication`
- Depth 2: `https://developer.getsnapscan.com/#error-codes`
- Depth 2: `https://developer.getsnapscan.com/#pagination`
- Depth 2: `https://developer.getsnapscan.com/#rate-limiting`
- Depth 2: `https://developer.getsnapscan.com/#webhook`
- Depth 2: `https://developer.getsnapscan.com/#creating-the-url`
- Depth 2: `https://developer.getsnapscan.com/#generating-a-qr-code`
- Depth 2: `https://developer.getsnapscan.com/#the-payment-object`
- Depth 2: `https://developer.getsnapscan.com/#get-all-payments`
- Depth 2: `https://developer.getsnapscan.com/#get-a-payment`
- Depth 2: `https://developer.getsnapscan.com/#get-all-cash-up-payments`
- Depth 2: `https://developer.getsnapscan.com/#the-cash-up-object`
- Depth 2: `https://developer.getsnapscan.com/#create-a-cash-up-period`
- Depth 2: `https://developer.getsnapscan.com/#get-all-cash-ups`
- Depth 2: `https://developer.getsnapscan.com/#javascript`
- Depth 2: `https://developer.getsnapscan.com/#ruby`
- Depth 2: `https://developer.getsnapscan.com/#python`
- Depth 2: `https://developer.getsnapscan.com/#php`
- Depth 2: `https://developer.getsnapscan.com/#c-35`
- Depth 2: `https://developer.getsnapscan.com/#java`
- Depth 3: `https://developer.getsnapscan.com/#query-parameters`
- Depth 3: `https://developer.getsnapscan.com/#response-headers`
- Depth 3: `https://developer.getsnapscan.com/#verifying-payload-authenticity`
- Depth 3: `https://developer.getsnapscan.com/#standard-snapcode`
- Depth 3: `https://developer.getsnapscan.com/#adding-payment-parameters`
- Depth 3: `https://developer.getsnapscan.com/#limiting-successful-payments-to-unique-id`
- Depth 3: `https://developer.getsnapscan.com/#adding-extra-parameters`
- Depth 3: `https://developer.getsnapscan.com/#http-request`
- Depth 3: `https://developer.getsnapscan.com/#response-codes`
- Depth 3: `https://developer.getsnapscan.com/#http-request-2`
- Depth 3: `https://developer.getsnapscan.com/#route-parameters`
- Depth 3: `https://developer.getsnapscan.com/#response-codes-2`
- Depth 3: `https://developer.getsnapscan.com/#http-request-3`
- Depth 3: `https://developer.getsnapscan.com/#route-parameters-2`
- Depth 3: `https://developer.getsnapscan.com/#response-codes-3`

### Any downloaded spec links (OpenAPI/Postman)

- NONE FOUND (docs did not link an OpenAPI/Swagger or Postman collection).
