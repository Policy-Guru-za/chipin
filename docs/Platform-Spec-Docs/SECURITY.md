# ChipIn Security Requirements

> **Version:** 1.0.0  
> **Last Updated:** January 2026  
> **Status:** Ready for Development

---

## Security Principles

1. **Minimize data collection** — Only collect what's essential
2. **Never store payment data** — Use hosted payment pages exclusively
3. **Encrypt at rest and in transit** — All sensitive data encrypted
4. **Principle of least privilege** — Minimal access by default
5. **Defense in depth** — Multiple layers of protection

---

## Data Classification

### Public Data
Data visible to anyone with the Dream Board link:
- Child's first name
- Child's photo
- Dream gift name and image (hidden after gift is fully funded)
- Charity overflow cause (shown after gift is fully funded)
- Contribution progress (percentage only while gift is funding)
- Contributor first names (if provided)
- Deadline

### Private Data (Host Only)
Data visible only to the authenticated host:
- Individual contribution amounts
- Contributor messages
- Payout email address
- Total raised (exact amount)

### Sensitive Data (System Only)
Data never exposed via UI:
- Host email address
- Payment references
- IP addresses (fraud detection)
- API keys
- Session tokens

### Never Stored
Data we explicitly do not store:
- Payment card numbers
- Bank account details
- CVV/CVC codes
- Full contributor email addresses

---

## Authentication

### Host Authentication

**Method:** Passwordless magic link

**Flow:**
1. Host enters email
2. System generates cryptographically random token (32 bytes)
3. Token hash stored with 1-hour expiry
4. Email sent with magic link
5. Host clicks link → token verified → session created
6. Session stored in HTTP-only, secure cookie

**Session Management:**
```typescript
interface Session {
  id: string;           // Random UUID
  hostId: string;       // Reference to host
  createdAt: Date;
  expiresAt: Date;      // 7 days from creation
  lastActiveAt: Date;   // Updated on each request
}
```

**Security Controls:**
- Token single-use (invalidated after verification)
- Token expires after 1 hour
- Sessions expire after 7 days of inactivity
- One active session per device (new login invalidates old)
- Session bound to user agent fingerprint

### Guest Authentication

**Method:** None required

Guests access Dream Boards via public URLs. No authentication needed.

**Security Controls:**
- Slug contains random suffix (not guessable)
- Rate limiting on contribution attempts
- CAPTCHA on suspicious activity

### API Authentication (Partners)

**Method:** API keys with Bearer token

```http
Authorization: Bearer cpk_live_xxxxxxxxxxxxxxxx
```

**Security Controls:**
- Keys hashed with bcrypt before storage
- Keys scoped to specific permissions
- Rate limiting per key
- IP allowlist option (enterprise)
- Key rotation support

---

## Payment Security

### PCI-DSS Compliance Strategy

**Our Approach:** SAQ-A (outsourced payment)

ChipIn never touches cardholder data. All payment data is collected by the payment provider's hosted page.

**Flow:**
```
Guest → ChipIn → Redirect → [PayFast Hosted Page] → Process → Redirect → ChipIn
                            ↑                                    │
                            └── Card data stays here ────────────┘
```

### Payment Provider Integration

| Provider | Integration Type | PCI Responsibility |
|----------|-----------------|-------------------|
| PayFast | Hosted page redirect | PayFast |
| Ozow | Hosted page redirect | Ozow |
| SnapScan | QR code (app-to-app) | SnapScan |

### Webhook Security

All provider webhooks verified via signature:

```typescript
// PayFast signature verification (raw body, order-preserving)
function verifyPayFastSignature(rawBody: string): boolean {
  const pairs = rawBody.split('&').filter(Boolean);
  const beforeSignature: string[] = [];
  let signature = '';

  for (const pair of pairs) {
    const [key, ...rest] = pair.split('=');
    if (key === 'signature') {
      signature = decodeURIComponent(rest.join('=').replace(/\+/g, '%20'));
      break;
    }
    beforeSignature.push(pair);
  }

  const paramString = beforeSignature.join('&');
  const passphrase = encodeURIComponent(PASSPHRASE).replace(/%20/g, '+').toUpperCase();
  const finalString = PASSPHRASE ? `${paramString}&passphrase=${passphrase}` : paramString;
  const expectedSignature = crypto.createHash('md5').update(finalString).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
```

**Additional Controls:**
- Webhook endpoints only accept POST
- Verify source IP where possible
- Idempotency via payment reference
- Replay protection via timestamp validation

---

## Data Protection (POPIA Compliance)

### Personal Information Handling

| Data Type | Legal Basis | Retention | Deletion |
|-----------|-------------|-----------|----------|
| Host email | Contract | Account lifetime | On request |
| Child name | Contract | Board lifetime + 90 days | Anonymized |
| Child photo | Contract | Board lifetime + 90 days | Deleted |
| Contributor name | Legitimate interest | Board lifetime + 90 days | Anonymized |
| IP address | Legitimate interest | 30 days | Auto-deleted |
| User agent | Legitimate interest | 30 days | Auto-deleted |
| Payment refs | Legal requirement | 7 years | Per regulation |

### Subject Rights Implementation

| Right | Implementation |
|-------|----------------|
| Access | Export data via dashboard or email request |
| Rectification | Edit via dashboard |
| Erasure | Delete account → anonymize/delete data |
| Portability | JSON export of host's data |
| Objection | Email to privacy@chipin.co.za |

### Data Minimization

- Child: First name only (no surname)
- Contributors: Optional name only (no email required)
- No geolocation tracking
- No behavioral analytics without consent
- No third-party tracking pixels

---

## Infrastructure Security

### HTTPS Everywhere

- All traffic over TLS 1.3
- HSTS enabled (max-age: 1 year)
- Certificate pinning for mobile (if native app added)

### Vercel Security

| Feature | Status |
|---------|--------|
| DDoS protection | Enabled (automatic) |
| WAF | Enabled (automatic) |
| Edge network | Global (reduced latency) |
| Automatic SSL | Enabled |

### Database Security (Neon)

| Feature | Status |
|---------|--------|
| Encryption at rest | Enabled (AES-256) |
| Encryption in transit | Enabled (TLS) |
| Automatic backups | Enabled (point-in-time) |
| Connection pooling | Enabled |
| IP allowlist | Vercel IPs only |

### Environment Variables

**Never commit to repository:**
```
DATABASE_URL
PAYFAST_PASSPHRASE
OZOW_CLIENT_ID
OZOW_CLIENT_SECRET
OZOW_WEBHOOK_SECRET
SNAPSCAN_API_KEY
SNAPSCAN_WEBHOOK_AUTH_KEY
RESEND_API_KEY
SESSION_SECRET
```

**Use Vercel environment variables with:**
- Production/Preview/Development separation
- Encrypted storage
- Access logging

---

## Application Security

### Input Validation

All user input validated and sanitized:

```typescript
// Example: Dream Board creation
const createDreamBoardSchema = z.object({
  childName: z.string().min(2).max(50).regex(/^[a-zA-Z\s'-]+$/),
  childPhotoUrl: z.string().url().startsWith('https://'),
  giftUrl: z.string().url().includes('takealot.com'),
  message: z.string().max(280).optional(),
  deadline: z.date().min(new Date()).max(addDays(new Date(), 90)),
  payoutEmail: z.string().email(),
});
```

### Output Encoding

- All user content HTML-escaped before rendering
- React's JSX auto-escapes by default
- Never use `dangerouslySetInnerHTML` with user content

### SQL Injection Prevention

- Use Drizzle ORM (parameterized queries only)
- No raw SQL concatenation
- Database user has minimal permissions

### CSRF Protection

- Same-site cookies (Lax)
- CSRF tokens for state-changing operations
- Origin header validation

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Magic link send | 5 | 15 min |
| Contribution attempt | 10 | 1 min |
| Dream Board creation | 5 | 1 hour |
| API (per key) | 1000 | 1 hour |
| Webhook (per IP) | 100 | 1 min |

Implementation:
```typescript
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1m'),
  analytics: true,
});

// In API route
const { success, limit, remaining } = await ratelimit.limit(ip);
if (!success) {
  return Response.json({ error: 'rate_limited' }, { status: 429 });
}
```

---

## Fraud Prevention

### Detection Rules

| Rule | Trigger | Action |
|------|---------|--------|
| Velocity | >5 contributions/IP/hour | Require CAPTCHA |
| High value | Single contribution >R10,000 | Manual review |
| New board spike | >R5,000 in first 24h | Hold payout |
| Card testing | Multiple small failures | Block IP |
| Geographic anomaly | Contribution from unexpected country | Flag for review |

### Implementation

```typescript
interface FraudSignal {
  type: 'velocity' | 'high_value' | 'new_board' | 'card_testing' | 'geo';
  severity: 'low' | 'medium' | 'high';
  action: 'allow' | 'captcha' | 'review' | 'block';
}

async function checkFraud(contribution: ContributionInput): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];
  
  // Check velocity
  const recentCount = await countRecentContributions(contribution.ip, '1h');
  if (recentCount > 5) {
    signals.push({ type: 'velocity', severity: 'medium', action: 'captcha' });
  }
  
  // Check amount
  if (contribution.amount > 1000000) { // R10,000
    signals.push({ type: 'high_value', severity: 'high', action: 'review' });
  }
  
  // More checks...
  
  return signals;
}
```

### Payout Holds

Payouts automatically held for review if:
- Dream Board created <24 hours ago AND pot >R5,000
- Any contribution flagged for fraud
- Host account <7 days old AND pot >R10,000

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P0 | Data breach, funds at risk | Immediate | Database compromise |
| P1 | Service down, payments failing | 1 hour | Payment provider outage |
| P2 | Degraded service | 4 hours | Slow page loads |
| P3 | Minor issue | 24 hours | Styling bug |

### Response Procedures

**P0 - Critical:**
1. Immediately notify founder
2. Assess scope of breach
3. Contain (disable affected systems)
4. Notify affected users within 72 hours (POPIA requirement)
5. Report to Information Regulator if personal data compromised
6. Post-incident review

**P1 - High:**
1. Alert on-call engineer
2. Identify root cause
3. Implement fix or rollback
4. Communicate status to affected users
5. Post-incident review

### Logging for Incidents

All security-relevant events logged:
- Authentication attempts (success/failure)
- Payment events
- Rate limit hits
- Fraud rule triggers
- Admin actions

Logs retained for 90 days, searchable via Vercel Logs.

---

## Security Checklist for Development

### Before Each Deploy

- [ ] No secrets in code or logs
- [ ] All inputs validated
- [ ] Error messages don't leak internals
- [ ] Rate limiting in place
- [ ] HTTPS enforced
- [ ] Dependencies up to date (`pnpm audit`)

### Monthly

- [ ] Review access logs
- [ ] Rotate API keys
- [ ] Update dependencies
- [ ] Review fraud rules effectiveness
- [ ] Test backup restoration

### Quarterly

- [ ] Security assessment
- [ ] Penetration test (if budget allows)
- [ ] Review POPIA compliance
- [ ] Update security documentation

---

## Contact

**Security issues:** security@chipin.co.za  
**Privacy requests:** privacy@chipin.co.za

Responsible disclosure welcome. We commit to:
- Acknowledge within 48 hours
- Provide status update within 7 days
- No legal action against good-faith reporters
