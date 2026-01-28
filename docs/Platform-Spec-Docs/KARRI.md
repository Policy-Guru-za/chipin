# Karri Card Integration

> **Status:** Optional  
> **Priority:** P1 (manual MVP, API later)

---

## Strategic Context

Karri is positioned as an **optional** payout method, not a dependency.

**Why optional, not required:**
1. Takealot gift cards work without any partnership
2. Better unit economics (affiliate commission vs. revenue share)
3. No external dependency for MVP launch
4. Karri partnership can be additive, not blocking

**What Karri would add:**
1. Flexibility for non-Takealot purchases
2. Trusted SA fintech brand ("Powered by Karri")
3. Viral loop (guests discover Karri, become future hosts)
4. Regulatory cover if needed

---

## Proposed Integration

### What We Need from Karri

```typescript
interface KarriAPI {
  // Verify a Karri Card is valid before pot closes
  verifyCard(cardNumber: string): Promise<CardVerification>;
  
  // Top up a Karri Card with pot funds
  topUpCard(params: TopUpParams): Promise<TopUpResult>;
  
  // Check top-up status (if async)
  getTopUpStatus(transactionId: string): Promise<TopUpStatus>;
}

interface CardVerification {
  valid: boolean;
  cardholderFirstName?: string;  // For display: "Load to Maya's Karri Card"
  errorCode?: string;            // If invalid
}

interface TopUpParams {
  cardNumber: string;
  amountCents: number;
  reference: string;             // ChipIn payout ID
  description: string;           // "Maya's Birthday Gift"
}

interface TopUpResult {
  transactionId: string;
  status: 'completed' | 'pending' | 'failed';
  completedAt?: Date;
  errorMessage?: string;
}
```

### What We Expose to Karri

Karri can integrate with our public API to:
1. Receive webhook notifications for `payout.ready` events
2. Confirm payout completion via `POST /v1/payouts/{id}/confirm`

This means ChipIn is the source of truth; Karri integrates with us.

---

## User Experience

### Host: Selecting Payout Method

During Dream Board creation, for a Takealot gift goal:

```
┌─────────────────────────────────────┐
│  Choose payout method               │
│                                     │
│  ○ Takealot Gift Card              │
│    Best for the exact item          │
│                                     │
│  ● Fund my Karri Card              │
│    Flexible spending with parental │
│    controls                         │
│                                     │
│  Karri Card Number:                 │
│  ┌─────────────────────────────────┐│
│  │ 5234 •••• •••• 1234             ││
│  └─────────────────────────────────┘│
│  ✓ Card verified: Maya's Card      │
│                                     │
└─────────────────────────────────────┘
```

### Guest: Post-Contribution

After contributing, show subtle Karri promotion:

```
┌─────────────────────────────────────┐
│                                     │
│         🎉 Thank you!               │
│                                     │
│  Your R200 helps fund Maya's        │
│  dream gift.                        │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  💳 Get a Karri Card for your      │
│     child                           │
│                                     │
│     Safe spending with parental     │
│     controls. Used by 500,000+      │
│     SA families.                    │
│                                     │
│     [Learn more →]                  │
│                                     │
└─────────────────────────────────────┘
```

---

## Data Flow

```
Host creates Dream Board
  └── Selects "Karri Card" payout
  └── Enters card number
        │
        ▼
ChipIn → Karri: verifyCard(number)
        │
        ▼
Karri returns: { valid: true, cardholderFirstName: "Maya" }
        │
        ▼
[Pot collects contributions]
        │
        ▼
Pot closes
        │
        ▼
ChipIn → Karri: topUpCard({
  cardNumber,
  amountCents: netPayout,
  reference: "po_abc123",
  description: "Maya's 7th Birthday Gift"
})
        │
        ▼
Karri returns: { transactionId: "K123", status: "completed" }
        │
        ▼
ChipIn marks payout complete
        │
        ▼
Email to host: "R2,400 loaded to Maya's Karri Card!"
```

---

## Security Considerations

### Card Number Handling

- Card numbers transmitted over HTTPS
- Stored encrypted at rest (if stored at all)
- Consider tokenization: store token, not raw number
- PCI implications: Karri is the custodian, we just pass through

### Verification

- Verify card before pot closes (not at creation time only)
- Handle case where card becomes invalid between creation and payout
- Fallback option if card payout fails

---

## Commercial Terms (To Negotiate)

| Item | Our Position |
|------|-------------|
| Revenue share | We keep majority (we bring the volume) |
| API access | Free or minimal cost |
| Branding | "Powered by Karri" acceptable |
| Exclusivity | We want non-exclusive (can add other cards) |
| Support | Karri handles card-related support |
| SLA | 99.9% uptime on API |

---

## Implementation Phases

### Phase 1: Manual (MVP)

1. Host enters Karri Card number
2. On pot close, admin receives alert
3. Admin manually tops up card via Karri merchant portal
4. Admin marks payout complete in ChipIn
5. System emails host

### Phase 2: API Integration

1. Implement `KarriAPI` interface
2. Automated card verification
3. Automated top-up on pot close
4. Webhook confirmation

### Phase 3: Deep Integration

1. "Sign up for Karri" flow for non-cardholders
2. Karri Card as default for return hosts
3. Karri promotional placement in guest flow
4. Analytics on Karri conversion

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Karri declines partnership | Medium | Proceed with Takealot-only; revisit later |
| Karri API unavailable | Low | Manual fallback process |
| Card top-up fails | Low | Retry logic; manual escalation |
| Regulatory change | Low | Karri absorbs compliance burden |

---

## Next Steps (If Pursuing)

1. [ ] Complete partnership thesis document (DONE)
2. [ ] Identify Karri contact / warm introduction
3. [ ] Schedule exploratory call
4. [ ] Request API documentation
5. [ ] Negotiate commercial terms
6. [ ] Technical integration (if terms agreed)
