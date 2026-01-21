# ChipIn Payment Flows

> **Version:** 1.0.0  
> **Last Updated:** January 2026  
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

**Under Evaluation:** Stitch (potential all-in-one provider). See `docs/payment-docs/STITCH.md`.

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
  passphrase: string;
  sandbox: boolean;
}

class PayFastProvider implements PaymentProvider {
  name = 'payfast';
  
  async createPayment(params: CreatePaymentParams): Promise<PaymentRequest> {
    const data = {
      merchant_id: this.config.merchantId,
      merchant_key: this.config.merchantKey,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      notify_url: params.notifyUrl,
      m_payment_id: params.reference,
      amount: (params.amount / 100).toFixed(2),
      item_name: params.description,
      email_address: params.customerEmail,
    };

    const signature = this.generateSignature(data);
    const queryString = new URLSearchParams({ ...data, signature }).toString();

    const baseUrl = this.config.sandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    return {
      providerReference: params.reference,
      redirectUrl: `${baseUrl}?${queryString}`,
    };
  }

  private generateSignature(data: Record<string, string>): string {
    const sortedData = Object.keys(data)
      .sort()
      .map(key => `${key}=${encodeURIComponent(data[key])}`)
      .join('&');
    
    const withPassphrase = `${sortedData}&passphrase=${this.config.passphrase}`;
    return crypto.createHash('md5').update(withPassphrase).digest('hex');
  }

  verifyWebhook(payload: Record<string, string>): boolean {
    const { signature, ...data } = payload;
    const expectedSignature = this.generateSignature(data);
    return signature === expectedSignature;
  }
}
```

### Ozow Integration

**Environment Variables:**
```
OZOW_SITE_CODE=xxx
OZOW_PRIVATE_KEY=xxx
OZOW_API_KEY=xxx
OZOW_SANDBOX=false
```

**Create Payment:**
```typescript
class OzowProvider implements PaymentProvider {
  name = 'ozow';

  async createPayment(params: CreatePaymentParams): Promise<PaymentRequest> {
    const data = {
      SiteCode: this.config.siteCode,
      CountryCode: 'ZA',
      CurrencyCode: 'ZAR',
      Amount: (params.amount / 100).toFixed(2),
      TransactionReference: params.reference,
      BankReference: params.reference,
      Optional1: '',
      Optional2: '',
      Optional3: '',
      Optional4: '',
      Optional5: '',
      Customer: params.customerEmail || '',
      CancelUrl: params.cancelUrl,
      ErrorUrl: params.cancelUrl,
      SuccessUrl: params.returnUrl,
      NotifyUrl: params.notifyUrl,
      IsTest: this.config.sandbox,
    };

    const hashSource = [
      data.SiteCode,
      data.CountryCode,
      data.CurrencyCode,
      data.Amount,
      data.TransactionReference,
      data.BankReference,
      data.CancelUrl,
      data.ErrorUrl,
      data.SuccessUrl,
      data.NotifyUrl,
      data.IsTest,
      this.config.privateKey,
    ].join('');

    const hash = crypto
      .createHash('sha512')
      .update(hashSource.toLowerCase())
      .digest('hex');

    // Ozow uses POST to their endpoint
    const baseUrl = this.config.sandbox
      ? 'https://pay.ozow.com'
      : 'https://pay.ozow.com';

    return {
      providerReference: params.reference,
      redirectUrl: baseUrl,
      postData: { ...data, HashCheck: hash },
    };
  }
}
```

### SnapScan Integration

**Environment Variables:**
```
SNAPSCAN_MERCHANT_ID=xxx
SNAPSCAN_API_KEY=xxx
```

**Create Payment:**
```typescript
class SnapScanProvider implements PaymentProvider {
  name = 'snapscan';

  async createPayment(params: CreatePaymentParams): Promise<PaymentRequest> {
    // SnapScan uses a different flow - generate QR code
    const response = await fetch('https://pos.snapscan.io/merchant/api/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount, // In cents
        merchantReference: params.reference,
        snapCode: this.config.merchantId,
      }),
    });

    const { id, qrCodeUrl } = await response.json();

    return {
      providerReference: id,
      redirectUrl: qrCodeUrl, // Actually a QR code URL
      isQrCode: true,
    };
  }
}
```

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

Select "Test Bank" in sandbox environment to simulate instant EFT.

### SnapScan Sandbox

Use SnapScan test app to scan QR codes in sandbox mode.

---

## Environment Configuration

```env
# PayFast
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_passphrase
PAYFAST_SANDBOX=true

# Ozow
OZOW_SITE_CODE=ABC-ABC-ABC
OZOW_PRIVATE_KEY=your_private_key
OZOW_API_KEY=your_api_key
OZOW_SANDBOX=true

# SnapScan
SNAPSCAN_MERCHANT_ID=your_merchant_id
SNAPSCAN_API_KEY=your_api_key

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
