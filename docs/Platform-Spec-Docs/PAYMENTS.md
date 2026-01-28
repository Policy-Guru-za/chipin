# ChipIn Payment Flows

> **Version:** 1.0.0  
> **Last Updated:** January 28, 2026  
> **Status:** Ready for Development

---

## Overview

ChipIn processes payments through South African payment providers. This document specifies the complete payment lifecycle from contribution to payout.

### Core Principle: ChipIn Never Holds Funds

```
Guest contributes → Payment Provider holds funds → Pot closes → Payout executed
                    ↑                                          ↓
                    └── ChipIn never touches the money ────────┘
```

This architecture:
- Avoids TPPP licensing requirements
- Reduces regulatory burden
- Leverages provider compliance (PCI-DSS, etc.)

---

## Payment Providers

### Supported Providers

| Provider | Payment Types | Use Case | Fees (approx.) |
|----------|--------------|----------|----------------|
| **PayFast** | Card, EFT, Mobicred | Primary provider | 2.9% + R2 (card) |
| **Ozow** | Instant EFT | Bank transfers | 1.5% |
| **SnapScan** | QR code | Quick mobile payments | 2.5% |

### Provider Selection Strategy

**Default:** PayFast (widest coverage)

**Guest Selection:** Allow guest to choose at payment time:
- "Pay with Card" → PayFast
- "Pay with EFT" → Ozow (faster than PayFast EFT)
- "Pay with SnapScan" → SnapScan

**Phase 1 scope:** PayFast + Ozow (One API, EFT) + SnapScan (QR).

**Stitch:** parked until float/settlement/compliance clarified; revisit in Phase 2. See `docs/payment-docs/STITCH.md`.

---

## Contribution Flow

### Sequence Diagram

```
┌──────┐     ┌──────┐     ┌──────────┐     ┌────────┐
│Guest │     │ChipIn│     │  Provider │     │Webhook │
└──┬───┘     └──┬───┘     └────┬─────┘     └───┬────┘
   │            │              │               │
   │ Select     │              │               │
   │ amount     │              │               │
   │───────────▶│              │               │
   │            │              │               │
   │            │ Create       │               │
   │            │ payment req  │               │
   │            │─────────────▶│               │
   │            │              │               │
   │            │◀─────────────│               │
   │            │ Redirect URL │               │
   │            │              │               │
   │◀───────────│              │               │
   │ Redirect   │              │               │
   │            │              │               │
   │──────────────────────────▶│               │
   │       Complete payment    │               │
   │            │              │               │
   │◀──────────────────────────│               │
   │       Redirect back       │               │
   │            │              │               │
   │            │              │──────────────▶│
   │            │              │  ITN/Webhook  │
   │            │              │               │
   │            │◀─────────────────────────────│
   │            │         Update DB            │
   │            │              │               │
   │◀───────────│              │               │
   │ Show thanks│              │               │
```

### Step-by-Step Flow

#### 1. Guest Initiates Payment

Guest selects amount and optional details on the contribution page.

**Frontend Action:**
```typescript
// POST /api/internal/contributions/create
const response = await fetch('/api/internal/contributions/create', {
  method: 'POST',
  body: JSON.stringify({
    dreamBoardId: 'db_abc123',
    amountCents: 20000,
    contributorName: 'Sarah M.',
    message: 'Happy birthday!',
    paymentProvider: 'payfast',
  }),
});

const { redirectUrl } = await response.json();
window.location.href = redirectUrl;
```

#### 2. ChipIn Creates Payment Request

**Backend Action:**
```typescript
// In contributions/create API route
async function createContribution(input: CreateContributionInput) {
  // 1. Create contribution record (pending)
  const contribution = await db.insert(contributions).values({
    dreamBoardId: input.dreamBoardId,
    amountCents: input.amountCents,
    feeCents: calculateFee(input.amountCents),
    contributorName: input.contributorName,
    message: input.message,
    paymentProvider: input.paymentProvider,
    paymentRef: generatePaymentRef(),
    paymentStatus: 'pending',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  }).returning();

  // 2. Create payment with provider
  const provider = getPaymentProvider(input.paymentProvider);
  const payment = await provider.createPayment({
    amount: input.amountCents,
    reference: contribution.paymentRef,
    description: `Contribution to ${dreamBoard.childName}'s Dream Gift`,
    returnUrl: `${BASE_URL}/${dreamBoard.slug}/thanks?ref=${contribution.paymentRef}`,
    cancelUrl: `${BASE_URL}/${dreamBoard.slug}?cancelled=true`,
    notifyUrl: `${BASE_URL}/api/webhooks/${input.paymentProvider}`,
    customerEmail: input.email,
  });

  return { redirectUrl: payment.redirectUrl };
}
```

#### 3. Guest Completes Payment

Guest is redirected to provider's hosted payment page:
- **PayFast:** Enters card details or selects EFT bank
- **Ozow:** Selects bank and authenticates
- **SnapScan:** Scans QR code with app

#### 4. Provider Sends Webhook

Provider sends notification to ChipIn webhook endpoint.

**PayFast ITN Example:**
```
POST /api/webhooks/payfast
Content-Type: application/x-www-form-urlencoded

m_payment_id=con_abc123
pf_payment_id=1234567
payment_status=COMPLETE
amount_gross=200.00
amount_fee=5.80
amount_net=194.20
...
signature=abc123...
```

#### 5. ChipIn Processes Webhook

```typescript
// In /api/webhooks/payfast
async function handlePayFastWebhook(payload: PayFastITN) {
  // 1. Verify signature
  if (!payfast.verifySignature(payload)) {
    throw new Error('Invalid signature');
  }

  // 2. Find contribution
  const contribution = await db.query.contributions.findFirst({
    where: eq(contributions.paymentRef, payload.m_payment_id),
  });

  if (!contribution) {
    throw new Error('Contribution not found');
  }

  // 3. Update contribution status
  const status = mapPayFastStatus(payload.payment_status);
  await db.update(contributions)
    .set({
      paymentStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(contributions.id, contribution.id));

  // 4. If successful, update dream board totals
  if (status === 'completed') {
    await updateDreamBoardTotals(contribution.dreamBoardId);
    await sendContributionNotification(contribution);
    
    // Check if goal reached
    await checkGoalReached(contribution.dreamBoardId);
  }

  return { received: true };
}
```

#### 6. Guest Sees Confirmation

Guest is redirected to thank you page with updated progress.

---

## Fee Structure

### Fee Calculation

```typescript
const FEE_PERCENTAGE = 0.03; // 3%
const MIN_FEE_CENTS = 300;   // R3 minimum
const MAX_FEE_CENTS = 50000; // R500 maximum

function calculateFee(amountCents: number): number {
  const fee = Math.round(amountCents * FEE_PERCENTAGE);
  return Math.max(MIN_FEE_CENTS, Math.min(MAX_FEE_CENTS, fee));
}
```

### Fee Breakdown

| Contribution | Our Fee (3%) | Provider Fee (~2.5%) | Net to ChipIn |
|--------------|--------------|---------------------|---------------|
| R100 | R3 (min) | ~R2.50 | ~R0.50 |
| R200 | R6 | ~R5 | ~R1 |
| R500 | R15 | ~R12.50 | ~R2.50 |
| R1,000 | R30 | ~R25 | ~R5 |

### Fee Display to Guest

Before payment:
```
Contribution: R200
ChipIn fee (3%): R6
Total: R206
```

---

## Provider Integrations

### Idempotency & Replay Safety

Payment provider webhooks are treated as **at-least-once** (duplicates and replays are expected).

**Required patterns:**
- Make contribution status updates idempotent: if the computed status equals the current status, **no-op + return 200**.
- Only perform side effects (e.g., marking a board funded, cache invalidation) **after** a status transition.
- Validate `amount_gross`/amount fields against the contribution’s expected total.
- Apply webhook rate limiting to reduce abuse and log structured warnings on rejects.

### PayFast Integration

**Environment Variables:**
```
PAYFAST_MERCHANT_ID=xxx
PAYFAST_MERCHANT_KEY=xxx
PAYFAST_PASSPHRASE=xxx
PAYFAST_SANDBOX=false
```

**Create Payment:**
```typescript
import crypto from 'crypto';

interface PayFastConfig {
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
  sandbox: boolean;
}

class PayFastProvider implements PaymentProvider {
  name = 'payfast';
  
  async createPayment(params: CreatePaymentParams): Promise<PaymentRequest> {
    const ordered: Array<[string, string]> = [
      ['merchant_id', this.config.merchantId],
      ['merchant_key', this.config.merchantKey],
      ['return_url', params.returnUrl],
      ['cancel_url', params.cancelUrl],
      ['notify_url', params.notifyUrl],
      ['email_address', params.customerEmail ?? ''],
      ['m_payment_id', params.reference],
      ['amount', (params.amount / 100).toFixed(2)],
      ['item_name', params.description],
    ].filter(([, value]) => value !== '');

    const signature = this.generateSignature(ordered);
    const formFields = Object.fromEntries([...ordered, ['signature', signature]]);

    const baseUrl = this.config.sandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    return {
      providerReference: params.reference,
      redirectUrl: baseUrl, // POST form fields to this URL
      formFields,
    };
  }

  private encodePayfast(value: string): string {
    return encodeURIComponent(value)
      .replace(/%20/g, '+')
      .replace(/%[0-9a-f]{2}/gi, match => match.toUpperCase());
  }

  private generateSignature(ordered: Array<[string, string]>): string {
    const paramString = ordered
      .map(([key, value]) => `${key}=${this.encodePayfast(value)}`)
      .join('&');

    const finalString = this.config.passphrase
      ? `${paramString}&passphrase=${this.encodePayfast(this.config.passphrase)}`
      : paramString;

    return crypto.createHash('md5').update(finalString).digest('hex');
  }

  private parseItn(rawBody: string): { fields: Array<[string, string]>; signature: string | null } {
    const fields: Array<[string, string]> = [];
    let signature: string | null = null;
    for (const pair of rawBody.split('&')) {
      if (!pair) continue;
      const [rawKey, ...rest] = pair.split('=');
      const rawValue = rest.join('=');
      const key = decodeURIComponent(rawKey);
      const value = decodeURIComponent(rawValue.replace(/\+/g, '%20'));
      if (key === 'signature') {
        signature = value;
        break;
      }
      fields.push([key, value]);
    }
    return { fields, signature };
  }

  verifyWebhook(rawBody: string): boolean {
    const { fields, signature } = this.parseItn(rawBody);
    if (!signature) return false;
    const expectedSignature = this.generateSignature(fields);
    return signature === expectedSignature;
  }
}
```

**PayFast ITN hardening (required):**
- Apply webhook rate limiting.
- Verify signature from **raw** ITN body (not parsed/reordered fields).
- In production, validate source IP.
- Validate merchant details.
- Validate timestamp if present (missing timestamp may be accepted but must be logged).
- POST back to PayFast `/eng/query/validate` and require `VALID`.
- Require `pf_payment_id` presence and process idempotently by contribution `payment_ref` + status transitions.
- Unresolved PayFast doc gaps tracked in `docs/payment-docs/payfast-open-questions.md`.

### Ozow Integration

**Environment Variables:**
```
OZOW_CLIENT_ID=xxx
OZOW_CLIENT_SECRET=xxx
OZOW_SITE_CODE=xxx
OZOW_BASE_URL=https://one.ozow.com/v1
OZOW_WEBHOOK_SECRET=xxx
```

**Create Payment:**
```typescript
import crypto from 'crypto';

interface OzowConfig {
  clientId: string;
  clientSecret: string;
  siteCode: string;
  baseUrl: string;
}

class OzowProvider implements PaymentProvider {
  name = 'ozow';

  async createPayment(params: CreatePaymentParams): Promise<PaymentRequest> {
    const accessToken = await this.getAccessToken('payment');
    const response = await fetch(`${this.config.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        siteCode: this.config.siteCode,
        amount: { currency: 'ZAR', value: Number((params.amount / 100).toFixed(2)) },
        merchantReference: params.reference,
        returnUrl: params.returnUrl,
        expireAt: params.expireAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    });

    const data = await response.json();

    return {
      providerReference: data.id,
      redirectUrl: data.redirectUrl,
    };
  }

  private async getAccessToken(scope: string): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope,
      grant_type: 'client_credentials',
    });

    const response = await fetch(`${this.config.baseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const json = await response.json();
    return json.access_token;
  }
}
```

**Ozow webhook handling (required):**
- Verify Svix signature (`svix-id`, `svix-timestamp`, `svix-signature`) with the webhook secret.
- Treat `returnUrl` params as untrusted; reconcile via webhooks or `GET /transactions/{id}`.

### SnapScan Integration

**Environment Variables:**
```
SNAPSCAN_SNAPCODE=xxx
SNAPSCAN_API_KEY=xxx
SNAPSCAN_WEBHOOK_AUTH_KEY=xxx
```

**Create Payment:**
```typescript
class SnapScanProvider implements PaymentProvider {
  name = 'snapscan';

  async createPayment(params: CreatePaymentParams): Promise<PaymentRequest> {
    const qrUrl = new URL(`https://pos.snapscan.io/qr/${this.config.snapCode}`);
    qrUrl.searchParams.set('id', params.reference);
    qrUrl.searchParams.set('amount', String(params.amount)); // cents
    qrUrl.searchParams.set('strict', 'true');

    const qrImageUrl = new URL(`https://pos.snapscan.io/qr/${this.config.snapCode}.svg`);
    qrImageUrl.searchParams.set('id', params.reference);
    qrImageUrl.searchParams.set('amount', String(params.amount));
    qrImageUrl.searchParams.set('strict', 'true');
    qrImageUrl.searchParams.set('snap_code_size', '200');

    return {
      providerReference: params.reference,
      redirectUrl: qrUrl.toString(), // QR URL (render or deep link)
      qrImageUrl: qrImageUrl.toString(),
      isQrCode: true,
    };
  }
}
```

**SnapScan webhook handling (required):**
- Verify `Authorization: SnapScan signature=...` using HMAC-SHA256 over the raw body.
- Parse `application/x-www-form-urlencoded` body and JSON-decode the `payload` field.

---

## Payout Flow

### Payout Types

| Type | Destination | Process |
|------|-------------|---------|
| `takealot_gift_card` | Takealot voucher to email | API or manual |
| `karri_card_topup` | Karri Card | Manual or API |
| `philanthropy_donation` | Charity partner (overflow) | API or manual |

### Payout Trigger Conditions

Payout can be triggered when:
1. **Goal reached** — Automatic trigger (configurable)
2. **Deadline passed** — Automatic trigger
3. **Manual close** — Host triggers from dashboard

When the goal is reached, guest view switches to **charity overflow** and contributions remain open until close.

### Payout Calculation

```typescript
interface PayoutCalculation {
  raisedCents: number;       // Total net contributions
  giftCents: number;         // Up to goal
  overflowCents: number;     // Charity overflow (open-ended)
  platformFeeCents: number;  // Our fee already deducted from contributions
  payoutFeeCents: number;    // Cost to execute payout (if any)
}

function calculatePayout(dreamBoard: DreamBoard): PayoutCalculation {
  // Get all completed contributions
  const contributions = await db.query.contributions.findMany({
    where: and(
      eq(contributions.dreamBoardId, dreamBoard.id),
      eq(contributions.paymentStatus, 'completed')
    ),
  });

  const raisedCents = contributions.reduce(
    (sum, c) => sum + c.amountCents - c.feeCents, // Net of our fee
    0
  );

  // Payout fee (e.g., cost of gift card issuance)
  const payoutFeeCents = 0; // Currently none

  const giftCents = Math.min(raisedCents, dreamBoard.goalCents);
  const overflowCents = Math.max(0, raisedCents - dreamBoard.goalCents);

  return {
    raisedCents,
    giftCents,
    overflowCents,
    platformFeeCents: contributions.reduce((sum, c) => sum + c.feeCents, 0),
    payoutFeeCents,
  };
}
```

### Takealot Gift Card Payout

**Option A: Affiliate API (Preferred)**

If Takealot provides affiliate/gift card API:
```typescript
async function executeTakealotPayout(payout: Payout): Promise<void> {
  const response = await fetch('https://api.takealot.com/gift-cards', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TAKEALOT_API_KEY}` },
    body: JSON.stringify({
      amount: payout.netCents / 100,
      recipientEmail: payout.recipientData.email,
      message: `Dream Gift for ${dreamBoard.childName}`,
    }),
  });

  const { giftCardCode, orderId } = await response.json();

  await db.update(payouts)
    .set({
      status: 'completed',
      externalRef: orderId,
      completedAt: new Date(),
    })
    .where(eq(payouts.id, payout.id));
}
```

**Option B: Manual Process (Fallback)**

If no API available:
1. Admin dashboard shows pending payouts
2. Admin manually purchases gift card on Takealot
3. Admin enters gift card code into ChipIn
4. ChipIn emails code to host
5. Mark payout as completed

```typescript
// Admin confirms manual payout
async function confirmManualPayout(payoutId: string, externalRef: string) {
  await db.update(payouts)
    .set({
      status: 'completed',
      externalRef,
      completedAt: new Date(),
    })
    .where(eq(payouts.id, payoutId));

  // Send email to host with gift card details
  await sendPayoutEmail(payout);
}
```

### Karri Card Top-up Payout

If the host selected **Fund my Karri Card**, execute a Karri top-up instead of a Takealot gift card.

**Manual (MVP):**
1. Admin receives payout alert
2. Admin tops up Karri Card via merchant portal
3. Admin marks payout complete
4. Email confirmation sent to host

**API (Future):**
Use `KarriAPI.topUpCard()` and confirm payout via webhook or status check.

### Charity Overflow Payout

If `overflowCents > 0`, create a **second payout** with type `philanthropy_donation` for the overflow amount.

---

## Refund Flow

### When Refunds Occur

1. **Dream Board cancelled** — Host cancels before closure
2. **Payout failure** — Cannot execute payout
3. **Fraud detection** — Suspicious activity

### Refund Process

```typescript
async function processRefunds(dreamBoardId: string): Promise<void> {
  const contributions = await db.query.contributions.findMany({
    where: and(
      eq(contributions.dreamBoardId, dreamBoardId),
      eq(contributions.paymentStatus, 'completed')
    ),
  });

  for (const contribution of contributions) {
    try {
      const provider = getPaymentProvider(contribution.paymentProvider);
      await provider.refund({
        reference: contribution.paymentRef,
        amount: contribution.amountCents,
        reason: 'Dream Board cancelled',
      });

      await db.update(contributions)
        .set({ paymentStatus: 'refunded' })
        .where(eq(contributions.id, contribution.id));
    } catch (error) {
      // Log error, may need manual intervention
      console.error(`Refund failed for ${contribution.id}:`, error);
    }
  }
}
```

---

## Fraud Prevention

### Detection Rules

| Rule | Trigger | Action |
|------|---------|--------|
| Velocity | >5 contributions from same IP in 1 hour | Require CAPTCHA |
| Amount | Single contribution >R10,000 | Manual review |
| Card testing | Multiple failed payments same IP | Block IP |
| New board + large amount | >R5,000 on board created <24h ago | Hold payout |

### Implementation

```typescript
async function checkFraudRules(contribution: ContributionInput): Promise<FraudCheckResult> {
  const checks = await Promise.all([
    checkVelocity(contribution.ipAddress),
    checkAmount(contribution.amountCents),
    checkBoardAge(contribution.dreamBoardId),
  ]);

  const flags = checks.filter(c => c.flagged);

  if (flags.some(f => f.action === 'block')) {
    return { allowed: false, reason: 'Suspicious activity detected' };
  }

  if (flags.some(f => f.action === 'captcha')) {
    return { allowed: true, requireCaptcha: true };
  }

  if (flags.some(f => f.action === 'review')) {
    // Flag for manual review but allow payment
    await flagForReview(contribution, flags);
  }

  return { allowed: true };
}
```

---

## Reconciliation

### Daily Reconciliation Process

```typescript
// Run daily via cron
async function dailyReconciliation(): Promise<void> {
  const yesterday = subDays(new Date(), 1);

  // 1. Get all contributions from yesterday
  const contributions = await db.query.contributions.findMany({
    where: and(
      gte(contributions.createdAt, startOfDay(yesterday)),
      lt(contributions.createdAt, endOfDay(yesterday))
    ),
  });

  // 2. Get settlements from each provider
  for (const provider of ['payfast', 'ozow', 'snapscan']) {
    const providerContributions = contributions.filter(
      c => c.paymentProvider === provider
    );

    const settlement = await getProviderSettlement(provider, yesterday);

    // 3. Compare and flag discrepancies
    const discrepancies = findDiscrepancies(providerContributions, settlement);

    if (discrepancies.length > 0) {
      await alertAdmins('Reconciliation discrepancy', discrepancies);
    }
  }

  // 4. Generate daily report
  await generateDailyReport(yesterday, contributions);
}
```

---

## Testing

### Test Cards (PayFast Sandbox)

| Card Number | Result |
|-------------|--------|
| 5200 0000 0000 0015 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 0036 | 3D Secure required |

### Test Banks (Ozow Sandbox)

Use the Ozow staging environment (`https://stagingone.ozow.com/v1`) and staging dashboard credentials to simulate EFT flows.

### SnapScan Sandbox

No sandbox environment is documented. Use controlled live testing with low-value transactions and confirm access with SnapScan.

---

## Environment Configuration

```env
# PayFast
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_passphrase
PAYFAST_SANDBOX=true

# Ozow
OZOW_CLIENT_ID=your_client_id
OZOW_CLIENT_SECRET=your_client_secret
OZOW_SITE_CODE=your_site_code
OZOW_BASE_URL=https://stagingone.ozow.com/v1

# SnapScan
SNAPSCAN_SNAPCODE=your_snapcode
SNAPSCAN_API_KEY=your_api_key
SNAPSCAN_WEBHOOK_AUTH_KEY=your_webhook_auth_key

# ChipIn
CHIPIN_FEE_PERCENTAGE=0.03
CHIPIN_MIN_CONTRIBUTION_CENTS=2000
CHIPIN_MAX_CONTRIBUTION_CENTS=1000000
```

---

## Document References

| Document | Purpose |
|----------|---------|
| [API.md](./API.md) | API endpoints for payments |
| [DATA.md](./DATA.md) | Contribution and payout data models |
| [SECURITY.md](./SECURITY.md) | Payment security requirements |
