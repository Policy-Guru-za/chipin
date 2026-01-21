# Takealot Integration

> **Status:** Primary gift source  
> **Priority:** P0 for MVP

---

## Purpose

Takealot serves two functions in ChipIn:

1. **Product Data Source** — Extract product details (name, price, image) from Takealot URLs
2. **Payout Destination (optional)** — Convert pot funds to Takealot gift cards when payout method is Takealot

---

## Product Data Extraction

### Primary Method: URL Parsing

Hosts paste a Takealot product URL. We extract structured data.

**Supported URL formats:**
```
https://www.takealot.com/lego-star-wars-death-star/PLID12345678
https://takealot.com/lego-star-wars-death-star/PLID12345678
```

### Extraction Strategy

**Priority 1: JSON-LD Structured Data**

Most Takealot product pages include Schema.org structured data:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "LEGO Star Wars Death Star",
  "image": "https://media.takealot.com/...",
  "description": "...",
  "offers": {
    "@type": "Offer",
    "price": "2499.00",
    "priceCurrency": "ZAR",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

**Priority 2: Open Graph Meta Tags**

Fallback if JSON-LD unavailable:

```html
<meta property="og:title" content="LEGO Star Wars Death Star | Takealot.com">
<meta property="og:image" content="https://media.takealot.com/...">
<meta property="product:price:amount" content="2499.00">
```

**Priority 3: Manual Entry**

If extraction fails, host manually enters:
- Product name
- Price
- Upload product screenshot

### Implementation

```typescript
// lib/integrations/takealot.ts

export interface TakealotProduct {
  url: string;
  productId: string | null;
  name: string;
  priceCents: number;
  imageUrl: string;
  inStock: boolean;
}

export async function fetchTakealotProduct(url: string): Promise<TakealotProduct> {
  // 1. Validate URL
  const urlObj = new URL(url);
  if (!urlObj.hostname.includes('takealot.com')) {
    throw new TakealotError('INVALID_URL', 'URL must be from takealot.com');
  }

  // 2. Extract product ID from URL
  const productIdMatch = url.match(/PLID(\d+)/i);
  const productId = productIdMatch ? productIdMatch[1] : null;

  // 3. Fetch page content
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ChipIn/1.0 (+https://chipin.co.za; product-info)',
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new TakealotError('FETCH_FAILED', `Failed to fetch: ${response.status}`);
  }

  const html = await response.text();

  // 4. Try JSON-LD extraction
  const jsonLdProduct = extractJsonLd(html);
  if (jsonLdProduct) {
    return {
      url,
      productId,
      name: jsonLdProduct.name,
      priceCents: parsePrice(jsonLdProduct.offers?.price),
      imageUrl: jsonLdProduct.image,
      inStock: jsonLdProduct.offers?.availability?.includes('InStock') ?? true,
    };
  }

  // 5. Fallback to Open Graph
  const ogProduct = extractOpenGraph(html);
  if (ogProduct.name && ogProduct.price) {
    return {
      url,
      productId,
      name: ogProduct.name.replace(' | Takealot.com', ''),
      priceCents: parsePrice(ogProduct.price),
      imageUrl: ogProduct.image || '',
      inStock: true, // Assume in stock if we can't determine
    };
  }

  // 6. Extraction failed
  throw new TakealotError('EXTRACTION_FAILED', 'Could not extract product details');
}

function extractJsonLd(html: string): any | null {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);
    // Handle array of JSON-LD objects
    const product = Array.isArray(data)
      ? data.find((d) => d['@type'] === 'Product')
      : data['@type'] === 'Product' ? data : null;
    return product;
  } catch {
    return null;
  }
}

function extractOpenGraph(html: string): Record<string, string> {
  const meta: Record<string, string> = {};

  // og:title
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
  if (titleMatch) meta.name = titleMatch[1];

  // og:image
  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (imageMatch) meta.image = imageMatch[1];

  // product:price:amount
  const priceMatch = html.match(/<meta property="product:price:amount" content="([^"]+)"/);
  if (priceMatch) meta.price = priceMatch[1];

  // Fallback: find price in page
  if (!meta.price) {
    const priceTextMatch = html.match(/R\s*([\d,]+(?:\.\d{2})?)/);
    if (priceTextMatch) meta.price = priceTextMatch[1];
  }

  return meta;
}

function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[R,\s]/g, '');
  return Math.round(parseFloat(cleaned) * 100);
}

export class TakealotError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'TakealotError';
  }
}
```

### Caching

Cache product data for 24 hours:

```typescript
const CACHE_TTL = 60 * 60 * 24; // 24 hours

export async function getProduct(url: string): Promise<TakealotProduct> {
  const cacheKey = `takealot:${hashUrl(url)}`;

  // Check cache
  const cached = await kv.get<TakealotProduct>(cacheKey);
  if (cached) return cached;

  // Fetch fresh
  const product = await fetchTakealotProduct(url);

  // Cache
  await kv.set(cacheKey, product, { ex: CACHE_TTL });

  return product;
}
```

---

## Gift Card Payout

### Investigation Required

**Questions to answer:**

1. Does Takealot offer a gift card API for partners/affiliates?
2. Can we purchase gift cards programmatically?
3. What are the fees/margins on gift card issuance?
4. Is there an affiliate program we can join?

### Potential Integration Paths

**Path A: Takealot Affiliate API (Ideal)**

If Takealot provides partner API:
- Request gift card issuance via API
- Receive gift card code/URL
- Email to host automatically

**Path B: Manual Process (MVP)**

For MVP launch without API:
1. Admin dashboard shows pending payouts
2. Admin purchases gift card on takealot.com
3. Admin enters gift card code into ChipIn
4. System emails gift card to host
5. Mark payout complete

**Path C: Third-Party Gift Card Provider**

Use a service like:
- **PayProp** — SA gift card aggregator
- **Reloadly** — International gift card API

```typescript
// Example: Third-party gift card API
async function purchaseGiftCard(amount: number, email: string): Promise<GiftCard> {
  const response = await fetch('https://api.giftcardprovider.com/v1/cards', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      brand: 'takealot',
      amount: amount / 100, // Convert cents to rands
      recipientEmail: email,
    }),
  });

  return response.json();
}
```

**Note:** If the host selects **Fund my Karri Card**, this payout path is skipped in favor of Karri top-up.

---

## Error Handling

### Product Fetch Errors

| Error Code | Cause | User Message |
|------------|-------|--------------|
| `INVALID_URL` | Not a Takealot URL | "Please paste a valid Takealot product link" |
| `FETCH_FAILED` | Network/server error | "Couldn't load product. Please try again." |
| `EXTRACTION_FAILED` | Can't parse product | "Couldn't read product details. Please enter manually." |
| `OUT_OF_STOCK` | Product unavailable | "This product is currently out of stock." |

### Graceful Degradation

If automatic extraction fails:
1. Show error message
2. Offer manual entry form:
   - Product name (text input)
   - Price (number input with R prefix)
   - Product image (file upload)
3. Still store original URL for reference

---

## Testing

### Test URLs

```typescript
const TEST_URLS = {
  standard: 'https://www.takealot.com/lego-star-wars-death-star/PLID12345678',
  noJsonLd: 'https://www.takealot.com/some-product/PLID87654321',
  outOfStock: 'https://www.takealot.com/discontinued-item/PLID11111111',
  invalid: 'https://www.amazon.com/product/123',
};
```

### Mock for Development

```typescript
// lib/integrations/takealot.mock.ts
export async function fetchTakealotProduct(url: string): Promise<TakealotProduct> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 500));

  return {
    url,
    productId: 'MOCK001',
    name: 'LEGO Star Wars Death Star (Mock)',
    priceCents: 249900,
    imageUrl: '/mock/lego-death-star.jpg',
    inStock: true,
  };
}
```

---

## Next Steps

1. [ ] Test URL extraction against variety of Takealot products
2. [ ] Investigate Takealot affiliate/partner program
3. [ ] Research third-party gift card APIs (PayProp, Reloadly)
4. [ ] Build manual payout admin interface for MVP
5. [ ] Contact Takealot about potential partnership
