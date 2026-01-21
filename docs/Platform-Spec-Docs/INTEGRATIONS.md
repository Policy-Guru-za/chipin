# ChipIn Third-Party Integrations

> **Version:** 1.0.0  
> **Last Updated:** January 2026  
> **Status:** Ready for Development

---

## Overview

ChipIn integrates with external services for product data, payments, and payouts. This document specifies the integration patterns and requirements.

### Integration Philosophy

**ChipIn exposes APIs; partners integrate with us.**

```
┌─────────────────────────────────────────────────────────────────┐
│                         ChipIn Platform                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Core Application                      │  │
│  │   Dream Boards │ Contributions │ Payouts │ Users          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                     ChipIn Public API                          │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │   Takealot  │     │   Payment   │     │   Future    │
   │   Products  │     │  Providers  │     │  Partners   │
   └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Takealot Integration

### Purpose

Fetch product data for Dream Board gift selection. The gift goal can payout via **Takealot gift card** or **Karri Card top-up** (payout method is separate from gift source).

### Integration Options (In Priority Order)

#### Option 1: Takealot Partner API (Preferred)

If Takealot provides partner/affiliate API access:

```typescript
interface TakealotAPI {
  searchProducts(query: string): Promise<TakealotProduct[]>;
  getProduct(productId: string): Promise<TakealotProduct>;
  getProductByUrl(url: string): Promise<TakealotProduct>;
}

interface TakealotProduct {
  id: string;
  name: string;
  description: string;
  price: number;        // In cents
  imageUrl: string;
  productUrl: string;
  inStock: boolean;
  category: string;
}
```

**Implementation:**
```typescript
class TakealotAPIClient implements TakealotAPI {
  private apiKey: string;
  private baseUrl = 'https://api.takealot.com/v1';

  async searchProducts(query: string): Promise<TakealotProduct[]> {
    const response = await fetch(
      `${this.baseUrl}/products/search?q=${encodeURIComponent(query)}`,
      { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
    );
    return response.json();
  }

  async getProductByUrl(url: string): Promise<TakealotProduct> {
    // Extract product ID from URL and fetch
    const productId = this.extractProductId(url);
    return this.getProduct(productId);
  }
}
```

#### Option 2: URL-Based Product Fetching (Fallback)

If no API available, fetch product data from URL:

```typescript
class TakealotScraper implements TakealotAPI {
  async getProductByUrl(url: string): Promise<TakealotProduct> {
    // Validate URL is from Takealot
    if (!this.isValidTakealotUrl(url)) {
      throw new Error('Invalid Takealot URL');
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ChipIn/1.0 (+https://chipin.co.za)' }
    });
    const html = await response.text();

    // Parse structured data (JSON-LD)
    const jsonLd = this.extractJsonLd(html);

    // Or parse Open Graph / meta tags
    const meta = this.extractMetaTags(html);

    return {
      id: this.extractProductId(url),
      name: jsonLd?.name || meta.title,
      description: jsonLd?.description || meta.description,
      price: this.parsePrice(jsonLd?.offers?.price || meta.price),
      imageUrl: jsonLd?.image || meta.image,
      productUrl: url,
      inStock: jsonLd?.offers?.availability === 'InStock',
      category: jsonLd?.category || 'Unknown',
    };
  }

  private extractJsonLd(html: string): any {
    const match = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }

  private extractMetaTags(html: string): Record<string, string> {
    const meta: Record<string, string> = {};
    
    // Open Graph
    const ogMatches = html.matchAll(/<meta property="og:(\w+)" content="([^"]+)"/g);
    for (const match of ogMatches) {
      meta[match[1]] = match[2];
    }

    // Twitter cards
    const twitterMatches = html.matchAll(/<meta name="twitter:(\w+)" content="([^"]+)"/g);
    for (const match of twitterMatches) {
      meta[match[1]] = match[2];
    }

    return meta;
  }
}
```

#### Option 3: Manual Entry (Ultimate Fallback)

If scraping becomes unreliable:

```typescript
interface ManualProductInput {
  productUrl: string;
  productName: string;
  productPrice: number;
  productImage: string;  // Host uploads screenshot
}
```

Host pastes URL and manually enters:
- Product name
- Price
- Uploads product image

### Product Data Caching

Cache product data to reduce load:

```typescript
const PRODUCT_CACHE_TTL = 60 * 60 * 24; // 24 hours

async function getProduct(url: string): Promise<TakealotProduct> {
  const cacheKey = `product:${hashUrl(url)}`;
  
  // Check cache
  const cached = await kv.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch fresh
  const product = await takealot.getProductByUrl(url);
  
  // Cache
  await kv.set(cacheKey, JSON.stringify(product), { ex: PRODUCT_CACHE_TTL });

  return product;
}
```

### Product Search UI Flow

```
┌─────────────────────────────────────┐
│  Search for a product on Takealot  │
│  ┌─────────────────────────────────┐│
│  │ 🔍 lego star wars               ││
│  └─────────────────────────────────┘│
│                                     │
│  ─── OR ───                        │
│                                     │
│  Paste a Takealot link:            │
│  ┌─────────────────────────────────┐│
│  │ https://www.takealot.com/...    ││
│  └─────────────────────────────────┘│
│                                     │
│  [Fetch Product]                    │
└─────────────────────────────────────┘
```

### Takealot Gift Card Payout

**Investigation Required:** Does Takealot offer:
- Affiliate program with gift card API?
- Corporate gift card purchase API?
- Bulk gift card purchasing?

**Fallback Process:**
1. Admin receives payout alert
2. Admin purchases gift card on takealot.com
3. Admin enters gift card code in ChipIn admin
4. ChipIn emails code to host

---

## Philanthropic Integration

### Purpose

Enable "Gift of Giving" — contribute to charitable causes instead of physical gifts. Also used as **charity overflow** after a Takealot gift is fully funded.

### Status: Placeholder

Requires investigation into:
- **GivenGain** — SA-based giving platform
- **BackaBuddy** — SA crowdfunding for causes
- **Direct charity partnerships** — Curated list of vetted causes

### Proposed Interface

```typescript
interface PhilanthropyProvider {
  getCauses(): Promise<Cause[]>;
  getCause(id: string): Promise<Cause>;
  createDonation(params: DonationParams): Promise<Donation>;
}

interface Cause {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  impacts: Impact[];     // Predefined impact levels
  minimumDonation: number;
}

interface Impact {
  amount: number;
  description: string;   // "Feed 10 children for a week"
}

interface DonationParams {
  causeId: string;
  amount: number;
  donorName: string;     // Child's name
  donorEmail: string;    // For certificate
}

interface Donation {
  id: string;
  certificateUrl: string;
  status: 'pending' | 'completed';
}
```

### Curated Cause Categories (Proposed)

| Category | Example Causes |
|----------|---------------|
| Education | School supplies, scholarships |
| Food Security | Meals for children |
| Animal Welfare | Wildlife conservation, shelters |
| Environment | Tree planting, ocean cleanup |
| Children's Health | Medical equipment, hospital support |

### Integration Flow

```
Host selects "Gift of Giving"
         │
         ▼
Browse curated causes (ChipIn-selected)
         │
         ▼
Select cause + impact level
         │
         ▼
Pot collects contributions
         │
         ▼
Pot closes → Donation executed
         │
         ▼
Certificate sent to host
```

---

## Karri Integration (Optional)

### Purpose

Optional payout route to child's Karri Card.

### Status: Optional Phase

Depends on partnership discussions with Karri Payments.

### Proposed Integration

**What ChipIn Needs:**
```typescript
interface KarriAPI {
  // Top up a Karri Card
  topUpCard(params: TopUpParams): Promise<TopUpResult>;
  
  // Verify card is valid (before pot closes)
  verifyCard(cardNumber: string): Promise<CardVerification>;
}

interface TopUpParams {
  cardNumber: string;
  amount: number;        // In cents
  reference: string;     // Our payout ID
  description: string;   // "Maya's Birthday Gift"
}

interface TopUpResult {
  transactionId: string;
  status: 'completed' | 'pending' | 'failed';
  completedAt?: Date;
}
```

**What ChipIn Exposes to Karri:**

Karri can integrate with our public API to:
- Receive `payout.ready` webhooks
- Confirm payout execution via `/payouts/{id}/confirm`

### Data Flow

```
ChipIn: Pot closes
         │
         ▼
ChipIn → Karri API: topUpCard(cardNumber, amount)
         │
         ▼
Karri: Tops up card, returns transactionId
         │
         ▼
ChipIn: Marks payout completed
         │
         ▼
ChipIn → Host: "Funds loaded to Karri Card!"
```

---

## Email Integration (Resend)

### Purpose

Transactional emails for authentication and notifications.

### Configuration

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@chipin.co.za
RESEND_FROM_NAME=ChipIn
```

### Implementation

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
const templates = {
  magicLink: (link: string) => ({
    subject: 'Your ChipIn magic link ✨',
    html: `
      <h1>Welcome to ChipIn!</h1>
      <p>Click below to continue:</p>
      <a href="${link}" style="...">Continue to ChipIn →</a>
      <p>This link expires in 1 hour.</p>
    `,
  }),

  contributionReceived: (data: ContributionNotificationData) => ({
    subject: `🎉 ${data.contributorName} just contributed to ${data.childName}'s Dream Gift!`,
    html: `
      <h1>New contribution!</h1>
      <p>${data.contributorName} contributed R${(data.amount / 100).toFixed(2)}</p>
      <p>Total raised: R${(data.totalRaised / 100).toFixed(2)} of R${(data.goal / 100).toFixed(2)}</p>
      <a href="${data.dashboardUrl}">View your Dream Board →</a>
    `,
  }),

  potFunded: (data: PotFundedData) => ({
    subject: `🎉 ${data.childName}'s Dream Gift is fully funded!`,
    html: `
      <h1>Goal reached!</h1>
      <p>${data.childName}'s dream gift is fully funded.</p>
      <a href="${data.dashboardUrl}">Request your payout →</a>
    `,
  }),

  payoutReady: (data: PayoutReadyData) => ({
    subject: `Your Takealot gift card is ready!`,
    html: `
      <h1>Time to shop! 🛒</h1>
      <p>The contributions for ${data.childName}'s Dream Gift have been converted to a Takealot gift card.</p>
      <p><strong>Gift Card Value:</strong> R${(data.amount / 100).toFixed(2)}</p>
      <p><strong>Gift Card Code:</strong> ${data.giftCardCode}</p>
      <p>Redeem at takealot.com</p>
    `,
  }),
};

// Send email
async function sendEmail(to: string, template: keyof typeof templates, data: any) {
  const { subject, html } = templates[template](data);
  
  await resend.emails.send({
    from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}
```

### Email Types

| Email | Trigger | Recipient |
|-------|---------|-----------|
| Magic Link | Auth request | Host |
| Dream Board Created | Board goes live | Host |
| Contribution Received | Payment confirmed | Host |
| Goal Reached | Total >= goal | Host |
| Deadline Reminder | 24h before deadline | Host |
| Pot Closed | Manual or auto close | Host |
| Payout Ready | Gift card issued | Host |

---

## Image Storage (Vercel Blob)

### Purpose

Store child photos uploaded during Dream Board creation.

### Implementation

```typescript
import { put, del } from '@vercel/blob';

async function uploadChildPhoto(file: File, dreamBoardId: string): Promise<string> {
  // Validate file
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB
    throw new Error('File too large');
  }

  // Upload with unique path
  const filename = `photos/${dreamBoardId}/${Date.now()}.${getExtension(file.type)}`;
  const { url } = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  });

  return url;
}

async function deleteChildPhoto(url: string): Promise<void> {
  await del(url);
}
```

### Image Processing

For MVP, use Vercel's automatic image optimization:

```typescript
// In Next.js, use the Image component
import Image from 'next/image';

<Image
  src={childPhotoUrl}
  alt={`${childName}'s photo`}
  width={200}
  height={200}
  className="rounded-full object-cover"
/>
```

---

## Analytics Integration (Future)

### Proposed: PostHog or Plausible

For privacy-respecting analytics:

```typescript
// Track key events
analytics.capture('dream_board_created', {
  giftType: 'takealot_product',
  goalAmount: 249900,
});

analytics.capture('contribution_received', {
  dreamBoardId: 'db_xxx',
  amount: 20000,
  paymentProvider: 'payfast',
});

analytics.capture('payout_completed', {
  dreamBoardId: 'db_xxx',
  payoutType: 'takealot_gift_card',
  amount: 240000,
});
```

---

## Integration Testing

### Mock Providers

For development and testing:

```typescript
// Mock Takealot provider
class MockTakealotProvider implements TakealotAPI {
  async searchProducts(query: string): Promise<TakealotProduct[]> {
    return [
      {
        id: 'MOCK001',
        name: 'LEGO Star Wars Death Star',
        price: 249900,
        imageUrl: '/mock/lego-death-star.jpg',
        productUrl: 'https://www.takealot.com/mock-product',
        inStock: true,
        category: 'Toys',
      },
    ];
  }
}

// Use mock in development
const takealot = process.env.NODE_ENV === 'production'
  ? new TakealotAPIClient()
  : new MockTakealotProvider();
```

### Integration Test Suite

```typescript
describe('Takealot Integration', () => {
  it('should fetch product by URL', async () => {
    const product = await takealot.getProductByUrl(
      'https://www.takealot.com/lego-star-wars-death-star/PLID12345'
    );
    
    expect(product.name).toBeDefined();
    expect(product.price).toBeGreaterThan(0);
    expect(product.imageUrl).toMatch(/^https?:\/\//);
  });

  it('should handle invalid URL', async () => {
    await expect(
      takealot.getProductByUrl('https://amazon.com/product')
    ).rejects.toThrow('Invalid Takealot URL');
  });
});
```

---

## Document References

| Document | Purpose |
|----------|---------|
| [API.md](./API.md) | ChipIn API that partners integrate with |
| [PAYMENTS.md](./PAYMENTS.md) | Payment provider integrations |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture |
