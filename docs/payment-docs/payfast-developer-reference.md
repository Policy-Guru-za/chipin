# PayFast Developer Reference (Integration-Focused)

## 1. Scope and Audience
- Covers PayFast Custom Integration (redirect), ITN (Instant Transaction Notifications), Onsite Payments (beta), Recurring Billing (subscriptions + tokenisation), refunds, and relevant API endpoints.
- Excludes non-technical marketing material and general support content (except where linked for integration troubleshooting).
- Intended reader: AI coding agents integrating PayFast into existing platforms.

## 2. Canonical Sources and Versioning
- Docs base URL: https://developers.payfast.co.za/docs
- API base URL: https://api.payfast.co.za
- API versioning: `version` header required (docs example: `v1`).
- Key pages used (canonical anchors):
  - https://developers.payfast.co.za/docs#quickstart
  - https://developers.payfast.co.za/docs#step_1_form_fields
  - https://developers.payfast.co.za/docs#step_2_signature
  - https://developers.payfast.co.za/docs#step_3_pay_on_payfast
  - https://developers.payfast.co.za/docs#step_4_confirm_payment
  - https://developers.payfast.co.za/docs#onsite_payments
  - https://developers.payfast.co.za/docs#subscriptions
  - https://developers.payfast.co.za/docs#splitpayments
  - https://developers.payfast.co.za/docs#ports-ips
  - https://developers.payfast.co.za/api#authentication
  - https://developers.payfast.co.za/api#recurring-billing
  - https://developers.payfast.co.za/api#refund-query
  - https://developers.payfast.co.za/api#refund-create

## 3. Quick Integration Summary (One Page)
1. Create an HTML form that POSTs to PayFast:
   - Sandbox: `https://sandbox.payfast.co.za/eng/process`
   - Live: `https://www.payfast.co.za/eng/process`
2. Include required payment fields (at minimum `merchant_id`, `merchant_key`, `amount`, `item_name`) plus your `return_url`, `cancel_url`, and `notify_url`.
3. Generate the **payment signature** (MD5) using PayFast’s **custom payment signature** rules (order-of-appearance, not alphabetical), include as `signature`.
4. Redirect the buyer to PayFast (submit the form).
5. Implement an ITN endpoint (`notify_url`) and return HTTP 200 to stop retries.
6. For each ITN:
   - Verify signature.
   - Confirm the notification originates from PayFast (docs’ valid domain list).
   - Confirm the payment amount matches what you expected (`amount_gross`).
   - POST back to PayFast validation endpoint (`/eng/query/validate`) and require response `VALID`.
7. Only mark a payment as complete after successful ITN verification.

If you only read one section, read **Section 8 (ITN)**.

## 4. Core Concepts and Objects
- **Merchant credentials (Custom Integration):** `merchant_id`, `merchant_key`, and an optional **passphrase** (salt) configured in the PayFast dashboard.
- **Signature (Custom Integration):** MD5 hash over a canonicalised parameter string + optional passphrase.
- **Transaction identifiers:**
  - `m_payment_id`: your internal reference (optional in ITN; shown as “Unique payment ID on the merchant’s system”).
  - `pf_payment_id`: PayFast transaction ID (required in ITN).
- **ITN:** server-to-server notification sent to `notify_url` before redirecting the buyer to `return_url`.
- **Recurring Billing:**
  - **Subscriptions**: charge on a schedule (frequency, billing date, cycles) set during the payment request.
  - **Tokenisation**: capture an agreement; future charges initiated via the API.

## 5. Environments, Credentials, and Access
- **Custom Integration URLs**
  - Sandbox POST payment URL: `https://sandbox.payfast.co.za/eng/process`
  - Live POST payment URL: `https://www.payfast.co.za/eng/process`
  - ITN validation (server confirmation) URL:
    - Sandbox: `https://sandbox.payfast.co.za/eng/query/validate`
    - Live: `https://www.payfast.co.za/eng/query/validate`
- **Onsite Payments (beta) endpoints**
  - Sandbox: `https://sandbox.payfast.co.za/onsite/process`
  - Live: `https://www.payfast.co.za/onsite/process`
- **Where to set passphrase (docs):** PayFast dashboard → Settings → “Security Pass Phrase” / “Salt Passphrase”.
- **API requirement:** docs state a passphrase **must** be set before any API interaction is allowed.
- **Sandbox test credentials (from docs):**
  - Merchant ID: 10000100
Merchant Key: 46f0cd694581a
Merchant Passphrase: jt7NOE43FZPn

## 6. Authentication and Integrity Controls

### 6.1 Custom Integration (redirect / form) signature
- Mechanism: **MD5 signature** sent as hidden form field `signature`.
- Canonical string rules (docs):
  - Concatenate **name=value** pairs of all **non-blank variables** with `&` as separator.
  - **Variable order:** in the **order in which they appear in the attributes description** (docs warning: do not use API alphabetical ordering).
  - Append `&passphrase=...` (passphrase configured in dashboard).
  - URL encoding must be **upper case** and spaces encoded as `+`.
  - MD5 the final string; send result as `signature`.

Verbatim source excerpt:
- https://developers.payfast.co.za/docs#step_2_signature
  - To generate the signature: 1. Concatenation of the name value pairs of all the non-blank variables with ‘&’ used as a separator Variable order: The pairs must be listed in the order in which they appear in the attributes description. eg. name_first=John&name_last=Doe​&email_address=… * Do not use the API signature format, which uses alphabetical ordering! 2. Add your passphrase The passphrase is an extra security feature, used as a ‘salt’, and is set by the Merchant in the Settings section of their Payfast Dashboard. Add the passphrase to the end of the below string. E.g. name_first=John&name_last=Doe​&email_address=…&passphrase=... The resultant URL encoding must be in upper case (eg. http%

### 6.2 PayFast API signature (Recurring Billing + other APIs)
- Mechanism: MD5 signature passed in request headers.
- Canonical string rules (docs):
  - Sort all submitted variables (headers, body, query string parameters and passphrase) in **alphabetical order**.
  - In test mode, the `testing` parameter should be **excluded** from the signature.
  - Concatenate non-empty variables as `key=urlencoded(value)` joined with `&`.
  - No trailing `&`.
  - MD5 hash; docs note signature characters must be in **lower case**.

Verbatim source excerpt:
- https://developers.payfast.co.za/api#authentication
  - Signature generation steps Sort all the submitted variables (header, body, query string parameters and passphrase) in alphabetical order. NOTE: When in test mode the testing parameter should be excluded from the signature. Create a string by concatenating all the non-empty, sorted variables, with ‘&’ used as a separator. Each value should also be urlencoded (eg. “merchant-id=10000100&passphrase=​passphrase&..&version=v1”) Make sure there is no trailing '&' MD5 hash your string. Variable order: The pairs must be listed in alphabetical order eg. email_address=john@doe.com&​name_first=John&name_last=Doe * Do not use the custom payment signature format, which requires pairs to be listed in the o

### 6.3 Common signature mistakes (from docs)
- Using alphabetical ordering for the **custom payment signature** (incorrect).
- Including `setup` (Split Payments) in the signature (docs explicitly say it is **not included**).
- Encoding spaces as `%20` instead of `+` (custom payment signature rule).

## 7. Payment Flows

### 7.1 Standard once-off payment (redirect to PayFast)
**Purpose**
- Redirect buyer to PayFast hosted checkout and receive server-to-server confirmation via ITN.

**Preconditions**
- Merchant ID + Key available.
- `notify_url` endpoint reachable from the Internet.

**Sequence**
1. Build HTML form with hidden inputs.
2. Generate `signature` (Section 6.1).
3. POST form to sandbox/live `eng/process`.
4. Buyer completes payment on PayFast.
5. PayFast sends ITN to `notify_url` (Section 8).
6. Buyer redirected to `return_url` or `cancel_url`.

**Required fields (from docs)**
| Field | Type/Format | Required | Notes |
| --- | --- | --- | --- |
| merchant_id | integer, 8 char | REQUIRED | The Merchant ID as given by the Payfast system. Used to uniquely identify the receiving account. This can be found on the merchant’s settings page. |
| merchant_key | string | REQUIRED | The Merchant Key as given by the Payfast system. Used to uniquely identify the receiving account. This provides an extra level of certainty concerning the correct account as both the ID and the Key must be correct in order for the transaction to proceed. This can be found on the merchant’s settings page. |
| return_url | string, no char limit | OPTIONAL | The URL where the user is returned to after payment has been successfully taken. |
| cancel_url | string, no char limit | OPTIONAL | The URL where the user should be redirected should they choose to cancel their payment while on the Payfast system. |
| notify_url | string, no char limit | OPTIONAL | The URL which is used by Payfast to post the Instant Transaction Notifications (ITNs) for this transaction. |
| fica_idnumber | integer, 13 char | OPTIONAL | The Fica ID Number provided of the buyer must be a valid South African ID Number. For the notify_url mentioned, a variable can be specified globally on the Merchant’s Payfast account or overridden on a per transaction basis. The value provided during a transaction overrides the global setting. |
| name_first | string, 100 char | OPTIONAL | The customer’s first name. |
| name_last | string, 100 char | OPTIONAL | The customer’s last name. |
| email_address | string, 100 char | OPTIONAL | The customer’s email address. |
| cell_number | string, 100 char | OPTIONAL | The customer’s valid cell number. If the email_address field is empty, and cell_number provided, the system will use the cell_number as the username and auto login the user, if they do not have a registered account |
| m_payment_id | string, 100 char | OPTIONAL | Unique payment ID on the merchant’s system. |
| amount | decimal | REQUIRED | The amount which the payer must pay in ZAR. |
| item_name | string, 100 char | REQUIRED | The name of the item being charged for, or in the case of multiple items the order number. |
| item_description | string, 255 char | OPTIONAL | The description of the item being charged for, or in the case of multiple items the order description. |
| custom_int<1..5> | integer, 255 char | OPTIONAL | A series of 5 custom integer variables (custom_int1, custom_int2…) which can be used by the merchant as pass-through variables. They will be posted back to the merchant at the completion of the transaction. |
| custom_str<1..5> | string, 255 char | OPTIONAL | A series of 5 custom string variables (custom_str1, custom_str2…) which can be used by the merchant as pass-through variables. They will be posted back to the merchant at the completion of the transaction. |
| email_confirmation | boolean, 1 char | OPTIONAL | Whether to send an email confirmation to the merchant of the transaction. The email confirmation is automatically sent to the payer. 1 = on, 0 = off |
| confirmation_address | string, 100 char | OPTIONAL | The email address to send the confirmation email to. This value can be set globally on your account. Using this field will override the value set in your account for this transaction. |
| payment_method | string, 3 char | OPTIONAL | When this field is set, only the SINGLE payment method specified can be used when the customer reaches Payfast. If this field is blank, or not included, then all available payment methods will be shown. The values are as follows: ‘ef’  –  EFT ‘cc’  –  Credit card ‘dc’  –  Debit card ’mp’  –  Masterpass Scan to Pay ‘mc’  –  Mobicred ‘sc’  –  SCode ‘ss’  –  SnapScan ‘zp’  –  Zapper ‘mt’  –  MoreTyme ‘rc’  –  Store card ‘mu’  –  Mukuru ‘ap’  –  Apple Pay ‘sp’  –  Samsung Pay ‘cp’  –  Capitec Pay ‘gp’  –  Google Pay ‘pf’  –  Payflex. Buy Now, Pay Later (See Recurring Billing subscriptions and Split Payments for additional fields) |

**Payment methods (from docs snippet in Step 1)**
- `payment_method` supported value shown: `cc` (credit card).

**Edge cases (docs)**
- `notify_url` can be set globally in dashboard or overridden per transaction.

### 7.2 Onsite Payments (beta)
**Purpose**
- Obtain a PayFast UUID server-side, then trigger the PayFast modal checkout in-page.

**Preconditions**
- Site served over **HTTPS** (docs requirement).

**Sequence**
1. Server POSTs payment + customer details to PayFast:
   - Live: `https://www.payfast.co.za/onsite/process`
   - Sandbox: `https://sandbox.payfast.co.za/onsite/process`
2. Receive `uuid` response.
3. Include PayFast engine script in page:
   - `https://www.payfast.co.za/onsite/engine.js`
4. Trigger modal via `window.payfast_do_onsite_payment`.
5. Payment confirmation still delivered via ITN to `notify_url`.

**Notes (docs)**
- `email_address` is required unless the merchant allows mobile registration.
- `cell_number` is required if `email_address` not set.
- If no `return_url` is submitted, modal closes without redirect.
- Callback initialisation option ignores return/cancel URLs (docs warning).

### 7.3 Subscriptions (Recurring Billing via Custom Integration)
**Purpose**
- Configure a schedule (frequency + cycles) during payment request.

**Key rules (docs)**
- For subscriptions, a passphrase is **REQUIRED** in the signature.
- Additional form fields:
  - `subscription_type=1` (required for subscriptions)
  - `frequency` (required; 1 daily, 2 weekly, 3 monthly, 4 quarterly, 5 biannually, 6 annual)
  - `cycles` (required; number of payments; `0` for indefinite)
  - `billing_date` (optional; defaults to current date)
  - `recurring_amount` (optional; defaults to `amount`; minimum value 5.00)
- Docs state it is possible to set up a subscription/tokenisation agreement with an initial `amount` of `R0.00`.

### 7.4 Split Payments
**Purpose**
- Split a portion of a payment to a third party merchant.

**Key rules (docs)**
- Split Payments must be enabled on your account.
- Amounts are in **cents**.
- Only one receiving merchant per split transaction.
- Additional form field:
  - `setup` (JSON encoded) **REQUIRED** for split payments; **not included in the signature**.

## 8. ITN (Instant Transaction Notifications)

### 8.1 Delivery behaviour (docs)
- ITN sent to `notify_url` **before** buyer redirect to `return_url`.
- Return HTTP 200 to stop retries.
- If no 200 is returned, docs state ITN is resent immediately, then after 10 minutes, then at exponentially longer intervals until eventually stopping.

### 8.2 ITN payload fields (docs)
| Field | Type/Format | Required | Notes |
| --- | --- | --- | --- |
| m_payment_id | string, 100 char | OPTIONAL | Unique payment ID on the merchant’s system. |
| pf_payment_id | integer | REQUIRED | Unique transaction ID on Payfast. |
| payment_status | string (CANCELLED / COMPLETE) | REQUIRED | After a successful payment the status sent will be COMPLETE. When a subscription is cancelled the status will be CANCELLED. |
| item_name | string, 100 char | REQUIRED | The name of the item being charged for, or in the case of multiple items the order number. |
| item_description | string, 255 char | OPTIONAL | The description of the item being charged for, or in the case of multiple items the order description. |
| amount_gross | decimal | OPTIONAL | The total amount the customer paid in ZAR. |
| amount_fee | decimal | OPTIONAL | The total in fees which was deducted from the amount in ZAR. |
| amount_net | decimal | OPTIONAL | The net amount credited to the merchant’s account in ZAR. |
| custom_int<1..5> | integer, 255 char | OPTIONAL | The series of 5 custom integer variables (custom_int1, custom_int2…) originally passed by the receiver during the payment request. |
| custom_str<1..5> | string, 255 char | OPTIONAL | The series of 5 custom string variables (custom_str1, custom_str2…) originally passed by the receiver during the payment request. |
| name_first | string, 100 char | OPTIONAL | The customer’s first name. |
| name_last | string, 100 char | OPTIONAL | The customer’s last name. |
| email_address | string, 100 char | OPTIONAL | The customer’s email address. |
| merchant_id | integer, 8 char | REQUIRED | The Merchant ID as given by the Payfast system. Used to uniquely identify the receiver’s account. |
| token | string, 36 char | REQUIRED | Unique ID on Payfast that represents the subscription. |
| billing_date | date, YYYY-MM-DD | OPTIONAL | The date from which future subscription payments will be made. Eg. 2020-01-01. Defaults to current date if not set. Security information |
| signature | MD5 hash in lower case | OPTIONAL | A security signature of the transmitted data taking the form of an MD5 hash of all the url encoded submitted variables. Example of a Transaction Webhook Payload Select library 4.3. Conduct security checks Conduct four security checks to ensure that the data you are receiving is correct, from the correct source and hasn’t been altered; you should not continue the process if a test fails! Notification page Select library Verify the signature Verify the security signature in the notification; this is done in a similar way that the signature that you generated for stage one of the user payment flow. The string that gets created needs to include all fields posted from Payfast. Verify Signature Select library Check that the notification has come from a valid Payfast domain The following is a list of valid domains: - www.payfast.co.za - w1w.payfast.co.za - w2w.payfast.co.za - sandbox.payfast.co.za Check valid Payfast domain Select library Compare payment data The amount you expected the customer to pay should match the “amount_gross” value sent in the notification. Compare payment data Select library Validate the data that you have received from Payfast by contacting our server and confirming the order details. Live: https://www.payfast.co.za/​eng/query/validate Sandbox: https://sandbox.payfast.co.za/​eng/query/validate Select library Bringing the checks together Select library |

### 8.3 Verification procedure (docs)
Docs describe **four security checks**; do not continue if any fail:
1. **Verify signature** (include all fields posted from PayFast).
2. **Validate source**: check notification came from a valid PayFast domain. Valid domains listed:
   - `www.payfast.co.za`
   - `w1w.payfast.co.za`
   - `w2w.payfast.co.za`
   - `sandbox.payfast.co.za`
3. **Compare payment data**: expected amount vs ITN `amount_gross`.
4. **Server confirmation**: POST-back to PayFast validation endpoint and require response `VALID`.
   - Live: `https://www.payfast.co.za/eng/query/validate`
   - Sandbox: `https://sandbox.payfast.co.za/eng/query/validate`

### 8.4 Idempotency strategy
UNKNOWN (docs did not specify): an idempotency key / replay token. Best practice is to process ITNs idempotently keyed by `pf_payment_id`.

### 8.5 Security hardening
- Docs provide:
  - Ports used by PayFast when calling `notify_url`: `80`, `8080`, `8081`, `443`.
  - PayFast server IP ranges (docs recommend whitelisting all):

```text
197.97.145.144/28 (197.97.145.144 - 197.97.145.159)
41.74.179.192/27 (41.74.179.192 – 41.74.179.223)
102.216.36.0/28 (102.216.36.0 - 102.216.36.15)
102.216.36.128/28 (102.216.36.128 - 102.216.36.143)
144.126.193.139
```

## 9. API / Endpoint Reference (Consolidated)

### 9.1 Custom Integration (hosted payment)
- **Payment processing**
  - Method + URL: `POST https://www.payfast.co.za/eng/process` (Live) / `POST https://sandbox.payfast.co.za/eng/process` (Sandbox)
  - Fields: see Section 7.1
- **ITN server confirmation**
  - Method + URL: `POST https://www.payfast.co.za/eng/query/validate` (Live) / `POST https://sandbox.payfast.co.za/eng/query/validate` (Sandbox)
  - Body: URL-encoded parameter string constructed from ITN payload (docs sample uses the ITN fields excluding `signature`).
  - Response: literal `VALID` indicates confirmation success.

### 9.2 PayFast API (base: https://api.payfast.co.za)
| Name | Method | Path | Notes |
| --- | --- | --- | --- |
| Ping | GET | /ping | Used to check if the API is responding. |
| Fetch subscription | GET | /subscriptions/:token/fetch | Returns subscription object (recurring) or tokenisation status (tokenisation). |
| Pause subscription | PUT | /subscriptions/:token/pause | Optional body: cycles (default 1). |
| Unpause subscription | PUT | /subscriptions/:token/unpause | Unpauses a subscription. |
| Cancel subscription | PUT | /subscriptions/:token/cancel | Cancels a subscription. |
| Update subscription | PATCH | /subscriptions/:token/update | Body: cycles|frequency|run_date|amount (cents). |
| Create ad-hoc payment | POST | /subscriptions/:token/adhoc | Create an ad-hoc subscription payment (tokenisation use-case). |
| Refund query | GET | /refunds/query/:id | Docs recommend calling before creating a refund; determines method + required fields. |
| Create refund | POST | /refunds/:id | Body includes amount (cents), reason; bank payout fields conditional. |
| Retrieve refund | GET | /refunds/retrieve/:id | Retrieve refund information. |
| Credit card transaction query | GET | /process/query/:id | Query a credit card transaction. |
| Transaction history (daily/weekly/monthly) | GET | /transactions/history/{period}?date=... | Transaction history endpoints. |

Common required headers (docs)
- `merchant-id` (Merchant ID)
- `version` (e.g. `v1`)
- `timestamp` (ISO-8601)
- `signature` (MD5 over alphabetised submitted variables + passphrase; lower case)

Sandbox testing (docs)
- Recurring Billing URLs use `?testing=true`.
- Docs note the `testing` parameter should be excluded from signature generation.

## 10. Errors, Status Codes, and Troubleshooting

### 10.1 API errors (docs)
- 4xx: request invalid (missing required parameter, etc.).
- 5xx: PayFast networking/application error.
- Error response shape:
```json
{
  "code": 400,
  "status": "failed",
  "data": {
    "response": false,
    "message": "Failure"
  }
}
```

### 10.2 Payment/ITN status (docs)
- `payment_status` values shown: `COMPLETE`, `CANCELLED`.

### 10.3 Diagnostics checklist
- Signature mismatch: verify ordering rules (custom payment vs API), encoding, and passphrase usage.
- ITN not received: ensure `notify_url` is public; ports/IP allowlist rules applied.
- Sandbox vs live: ensure hostnames and credentials match environment.

## 11. Security and Compliance Notes
- PayFast states it is PCI DSS level 1 compliant (PCI compliance section).
- Outsourcing card payments to PayFast reduces PCI burden for merchants (docs statement).

## 12. Rate Limits, Performance, and Reliability
- UNKNOWN (docs did not specify): rate limits, quotas, API timeouts.
- ITN retry schedule: immediate, 10 minutes, then exponential backoff until stopping (docs).

## 13. Testing Strategy
- Sandbox testing:
  - Use sandbox URLs (Section 5).
  - Use sandbox buyer credentials (docs): `sbtu01@payfast.io` / `clientpass`.
- Test cases:
  - Happy path (COMPLETE)
  - Cancelled payment (redirect to `cancel_url`)
  - Signature mismatch (intentional)
  - ITN replay (send same payload twice; ensure idempotency)
  - Onsite modal flow (UUID + modal + ITN)

## 14. Implementation Checklists

### 14.1 Backend
- Store PayFast credentials and passphrase as secrets.
- Generate payment signature exactly per Section 6.1.
- Create an ITN endpoint that:
  - returns HTTP 200
  - validates signature, domain, expected amount, and PayFast POST-back
  - processes idempotently on `pf_payment_id`

### 14.2 Frontend/redirect
- Use an HTML POST (hidden form) to PayFast `eng/process`.
- Ensure `return_url` and `cancel_url` UX are resilient to missing ITN.

### 14.3 Ops
- Allow inbound ports `80`, `8080`, `8081`, `443` for ITN.
- Consider whitelisting PayFast IP ranges provided in docs.
- Monitor PayFast API status endpoints (if used).

## 15. Copy-Paste Integration Snippets

### 15.1 Node.js (TypeScript)

```ts
import crypto from 'node:crypto';
import dns from 'node:dns/promises';

type Env = {
  PAYFAST_MERCHANT_ID: string;
  PAYFAST_MERCHANT_KEY: string;
  PAYFAST_PASSPHRASE?: string;
  PAYFAST_SANDBOX?: string; // 'true'|'false'
};

function requireEnv(name: keyof Env, env: Env): string {
  const v = env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function encodePayfast(value: string): string {
  // Docs: upper-case URL encoding; spaces as '+'.
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase());
}

function md5HexLower(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

export function buildPayfastRedirectForm(params: {
  env: Env;
  amountZar: string; // decimal string, e.g. '200.00'
  itemName: string;
  mPaymentId?: string;
  returnUrl?: string;
  cancelUrl?: string;
  notifyUrl?: string;
  emailAddress?: string;
}): { actionUrl: string; fields: Array<[string, string]> } {
  const merchantId = requireEnv('PAYFAST_MERCHANT_ID', params.env);
  const merchantKey = requireEnv('PAYFAST_MERCHANT_KEY', params.env);

  const isSandbox = params.env.PAYFAST_SANDBOX === 'true';
  const actionUrl = isSandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  // Docs: variable order must match the attributes description order.
  const ordered: Array<[string, string | undefined]> = [
    ['merchant_id', merchantId],
    ['merchant_key', merchantKey],
    ['return_url', params.returnUrl],
    ['cancel_url', params.cancelUrl],
    ['notify_url', params.notifyUrl],
    ['email_address', params.emailAddress],
    ['m_payment_id', params.mPaymentId],
    ['amount', params.amountZar],
    ['item_name', params.itemName],
  ];

  const nonBlank = ordered.filter(([, v]) => v != null && v !== '');
  const paramString = nonBlank
    .map(([k, v]) => `${k}=${encodePayfast(String(v))}`)
    .join('&');

  const finalString = params.env.PAYFAST_PASSPHRASE
    ? `${paramString}&passphrase=${encodePayfast(params.env.PAYFAST_PASSPHRASE)}`
    : paramString;

  const signature = md5HexLower(finalString);

  const fields: Array<[string, string]> = [
    ...nonBlank.map(([k, v]) => [k, String(v)] as [string, string]),
    ['signature', signature],
  ];

  return { actionUrl, fields };
}

async function payfastValidDomainFromReferer(referer: string | null): Promise<boolean> {
  if (!referer) return false;
  const host = new URL(referer).hostname;

  // Docs list these as valid PayFast domains.
  const validHosts = ['www.payfast.co.za', 'sandbox.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za'];
  const validIps = new Set<string>();

  for (const h of validHosts) {
    try {
      for (const ip of await dns.resolve4(h)) validIps.add(ip);
    } catch {
      // ignore
    }
  }

  try {
    for (const ip of await dns.resolve4(host)) {
      if (validIps.has(ip)) return true;
    }
  } catch {
    return false;
  }

  return false;
}

type IdempotencyStore = {
  has: (key: string) => Promise<boolean>;
  add: (key: string) => Promise<void>;
};

export async function verifyPayfastItn(params: {
  env: Env;
  rawBody: string; // raw x-www-form-urlencoded body
  referer: string | null;
  expectedAmountGrossZar?: string; // e.g. '200.00'
  idempotency: IdempotencyStore;
}): Promise<{ ok: true; data: Record<string, string> } | { ok: false; reason: string }> {
  const isSandbox = params.env.PAYFAST_SANDBOX === 'true';
  const pfHost = isSandbox ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';

  const fromValidDomain = await payfastValidDomainFromReferer(params.referer);
  if (!fromValidDomain) return { ok: false, reason: 'invalid payfast domain (referer check)' };

  const pairs = params.rawBody.split('&').filter(Boolean);
  const data: Record<string, string> = {};
  let signatureValue: string | undefined;
  const beforeSignature: string[] = [];

  for (const pair of pairs) {
    const [k, ...rest] = pair.split('=');
    const v = rest.join('=');
    if (k === 'signature') {
      signatureValue = decodeURIComponent(v.replace(/\+/g, '%20'));
      break;
    }
    beforeSignature.push(`${k}=${v}`);
    data[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, '%20'));
  }

  if (!signatureValue) return { ok: false, reason: 'missing signature' };

  const pfParamString = beforeSignature.join('&');
  const finalString = params.env.PAYFAST_PASSPHRASE
    ? `${pfParamString}&passphrase=${encodePayfast(params.env.PAYFAST_PASSPHRASE)}`
    : pfParamString;

  const expectedSignature = md5HexLower(finalString);
  if (signatureValue !== expectedSignature) return { ok: false, reason: 'signature mismatch' };

  if (params.expectedAmountGrossZar) {
    const amountGross = data['amount_gross'];
    if (!amountGross) return { ok: false, reason: 'missing amount_gross' };
    if (amountGross !== params.expectedAmountGrossZar) return { ok: false, reason: 'amount mismatch' };
  }

  const pfPaymentId = data['pf_payment_id'];
  if (pfPaymentId) {
    const already = await params.idempotency.has(`payfast:itn:${pfPaymentId}`);
    if (already) return { ok: false, reason: 'duplicate itn' };
  }

  let validationText: string;
  try {
    const validationResp = await fetch(`https://${pfHost}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: pfParamString,
    });

    validationText = (await validationResp.text()).trim();
  } catch (e) {
    console.error('PayFast ITN validation request failed', e);
    return { ok: false, reason: 'server confirmation request failed' };
  }

  if (validationText !== 'VALID') return { ok: false, reason: `server confirmation failed: ${validationText}` };

  if (pfPaymentId) await params.idempotency.add(`payfast:itn:${pfPaymentId}`);

  return { ok: true, data };
}
```

### 15.2 Python (FastAPI-style)

```py
import hashlib
import logging
import os
import socket
from typing import Dict, Tuple
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, Request, Response

app = FastAPI()

logger = logging.getLogger("payfast")

PAYFAST_PASSPHRASE = os.getenv('PAYFAST_PASSPHRASE')
PAYFAST_SANDBOX = os.getenv('PAYFAST_SANDBOX', 'true') == 'true'


def md5_hex_lower(s: str) -> str:
    return hashlib.md5(s.encode('utf-8')).hexdigest()


def valid_payfast_domain_from_referer(referer: str | None) -> bool:
    if not referer:
        return False

    try:
        host = urlparse(referer).hostname
    except Exception:
        return False

    if not host:
        return False

    valid_hosts = ['www.payfast.co.za', 'sandbox.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za']
    valid_ips: set[str] = set()

    for h in valid_hosts:
        try:
            _name, _aliases, ips = socket.gethostbyname_ex(h)
            valid_ips.update(ips)
        except Exception:
            continue

    try:
        _name, _aliases, ips = socket.gethostbyname_ex(host)
    except Exception:
        return False

    return any(ip in valid_ips for ip in ips)


def verify_itn_signature(raw_body: str) -> Tuple[bool, Dict[str, str], str, str]:
    pairs = [p for p in raw_body.split('&') if p]
    before_sig = []
    data: Dict[str, str] = {}
    signature = None

    for pair in pairs:
        k, _, v = pair.partition('=')
        if k == 'signature':
            signature = v
            break
        before_sig.append(f"{k}={v}")
        data[k] = v

    if signature is None:
        return False, {}, '', 'missing signature'

    pf_param_string = '&'.join(before_sig)

    if PAYFAST_PASSPHRASE:
        passphrase_enc = httpx.QueryParams({'passphrase': PAYFAST_PASSPHRASE})['passphrase']
        final_string = pf_param_string + '&passphrase=' + passphrase_enc
    else:
        final_string = pf_param_string

    expected = md5_hex_lower(final_string)
    if signature != expected:
        return False, {}, '', 'signature mismatch'

    return True, data, pf_param_string, ''


async def idempotency_has(key: str) -> bool:
    return False


async def idempotency_add(key: str) -> None:
    return None


@app.post('/payfast/itn')
async def payfast_itn(request: Request) -> Response:
    if not valid_payfast_domain_from_referer(request.headers.get('referer')):
        logger.warning('PayFast ITN rejected: invalid referer domain')
        return Response(status_code=200)

    raw_body = (await request.body()).decode('utf-8')

    ok, data, pf_param_string, err = verify_itn_signature(raw_body)
    if not ok:
        logger.warning('PayFast ITN rejected: %s', err)
        return Response(status_code=200)

    pf_payment_id = data.get('pf_payment_id')
    if pf_payment_id and await idempotency_has(f"payfast:itn:{pf_payment_id}"):
        return Response(status_code=200)

    pf_host = 'sandbox.payfast.co.za' if PAYFAST_SANDBOX else 'www.payfast.co.za'

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            f"https://{pf_host}/eng/query/validate",
            content=pf_param_string,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
        )

    if r.text.strip() != 'VALID':
        logger.warning('PayFast ITN rejected: server confirmation failed (%s)', r.text.strip())
        return Response(status_code=200)

    if pf_payment_id:
        await idempotency_add(f"payfast:itn:{pf_payment_id}")

    return Response(status_code=200)
```


## 16. Appendix
### Glossary
- **ITN**: Instant Transaction Notification.
- **Custom Integration**: Redirect flow using HTML POST to PayFast.
- **Tokenisation**: PayFast agreement allowing future charges via API.

### Full list of crawled URLs (with depth)
- See `docs/payment-docs/payfast-crawl-manifest.json`.

### Specs / artefacts
- Postman collection: https://documenter.getpostman.com/view/10608852/TVCmSQZu
- PHP SDK: https://github.com/PayFast/payfast-php-sdk
