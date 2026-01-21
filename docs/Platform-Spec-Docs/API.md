# ChipIn Public API Specification

> **Version:** 1.0.0  
> **Last Updated:** January 2026  
> **Status:** Ready for Development

---

## Overview

ChipIn exposes a RESTful API for partner integrations. The API follows the principle that **ChipIn is the source of truth** — partners integrate with us, not the reverse.

### Base URL

```
Production:  https://api.chipin.co.za/v1
Development: http://localhost:3000/api/v1
```

### API Design Principles

1. **RESTful** — Resources as nouns, HTTP methods as verbs
2. **JSON** — All request/response bodies are JSON
3. **Versioned** — URL versioning (`/v1/`)
4. **Consistent** — Standard error formats, pagination, filtering
5. **Secure** — HTTPS only, API key authentication, webhook signatures

---

## Authentication

### API Keys

All API requests require authentication via API key in the Authorization header:

```http
Authorization: Bearer cpk_live_xxxxxxxxxxxxxxxxxxxx
```

**Key Format:**
- Prefix: `cpk_live_` (production) or `cpk_test_` (sandbox)
- Length: 32 characters after prefix
- Example: `cpk_live_abc123def456ghi789jkl012mno345`

**Key Scopes:**
| Scope | Description |
|-------|-------------|
| `dreamboards:read` | Read Dream Board data |
| `dreamboards:write` | Create/update Dream Boards |
| `contributions:read` | Read contribution data |
| `payouts:read` | Read payout status |
| `payouts:write` | Confirm payout execution |
| `webhooks:manage` | Manage webhook endpoints |

### Rate Limiting

| Tier | Requests/Hour | Burst |
|------|---------------|-------|
| Default | 1,000 | 100/min |
| Partner | 10,000 | 500/min |
| Enterprise | Custom | Custom |

Rate limit headers in every response:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1706140800
```

---

## Common Response Formats

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-01-21T10:30:00Z"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid input data",
    "details": {
      "field": "amount",
      "reason": "must be at least 2000 cents"
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-01-21T10:30:00Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `unauthorized` | 401 | Invalid or missing API key |
| `forbidden` | 403 | Valid key but insufficient scope |
| `not_found` | 404 | Resource does not exist |
| `validation_error` | 400 | Invalid request parameters |
| `conflict` | 409 | Resource state conflict |
| `rate_limited` | 429 | Too many requests |
| `internal_error` | 500 | Server error |

### Pagination

List endpoints support cursor-based pagination:

```http
GET /v1/dream-boards?limit=20&after=cursor_xyz
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "has_more": true,
    "next_cursor": "cursor_abc",
    "total_count": 150
  }
}
```

---

## Endpoints

### Dream Boards

#### Create Dream Board

```http
POST /v1/dream-boards
```

**Request Body:**
```json
{
  "child_name": "Maya",
  "child_photo_url": "https://storage.chipin.co.za/photos/abc123.jpg",
  "birthday_date": "2026-02-15",
  "gift_type": "takealot_product",
  "gift_data": {
    "product_url": "https://www.takealot.com/lego-star-wars-death-star/PLID12345",
    "product_name": "LEGO Star Wars Death Star",
    "product_image": "https://media.takealot.com/...",
    "product_price": 249900
  },
  "payout_method": "takealot_gift_card",
  "overflow_gift_data": {
    "cause_id": "food-forward",
    "cause_name": "Feed Hungry Children",
    "impact_description": "Feed 10 children for a week"
  },
  "goal_cents": 249900,
  "message": "Maya would love your contribution toward her dream Lego set!",
  "deadline": "2026-02-14T23:59:59Z",
  "payout_email": "parent@example.com"
}
```

**Notes:**
- `overflow_gift_data` is required when `gift_type = takealot_product`.
- For `gift_type = philanthropy`, set `payout_method = philanthropy_donation`.
- When `raised_cents >= goal_cents`, `display_mode` switches to `charity` and gift details are hidden in guest view.

**Response:** `201 Created`
```json
{
  "data": {
    "id": "db_abc123def456",
    "slug": "maya-7th-birthday-x7k9m2",
    "child_name": "Maya",
    "child_photo_url": "https://storage.chipin.co.za/photos/abc123.jpg",
    "birthday_date": "2026-02-15",
    "gift_type": "takealot_product",
    "gift_data": {
      "product_url": "https://www.takealot.com/lego-star-wars-death-star/PLID12345",
      "product_name": "LEGO Star Wars Death Star",
      "product_image": "https://media.takealot.com/...",
      "product_price": 249900
    },
    "payout_method": "takealot_gift_card",
    "overflow_gift_data": {
      "cause_id": "food-forward",
      "cause_name": "Feed Hungry Children",
      "impact_description": "Feed 10 children for a week"
    },
    "goal_cents": 249900,
    "raised_cents": 0,
    "overflow_cents": 0,
    "message": "Maya would love your contribution toward her dream Lego set!",
    "deadline": "2026-02-14T23:59:59Z",
    "status": "active",
    "display_mode": "gift",
    "contribution_count": 0,
    "public_url": "https://chipin.co.za/maya-7th-birthday-x7k9m2",
    "created_at": "2026-01-21T10:30:00Z",
    "updated_at": "2026-01-21T10:30:00Z"
  }
}
```

#### Get Dream Board

```http
GET /v1/dream-boards/{id}
```

**Path Parameters:**
- `id` — Dream Board ID (`db_xxx`) or slug

**Response:** `200 OK`
```json
{
  "data": {
    "id": "db_abc123def456",
    "slug": "maya-7th-birthday-x7k9m2",
    "child_name": "Maya",
    "child_photo_url": "https://storage.chipin.co.za/photos/abc123.jpg",
    "birthday_date": "2026-02-15",
    "gift_type": "takealot_product",
    "gift_data": { ... },
    "payout_method": "takealot_gift_card",
    "overflow_gift_data": { ... },
    "goal_cents": 249900,
    "raised_cents": 125000,
    "overflow_cents": 0,
    "message": "...",
    "deadline": "2026-02-14T23:59:59Z",
    "status": "active",
    "display_mode": "gift",
    "contribution_count": 8,
    "public_url": "https://chipin.co.za/maya-7th-birthday-x7k9m2",
    "created_at": "2026-01-21T10:30:00Z",
    "updated_at": "2026-01-22T15:45:00Z"
  }
}
```

#### List Dream Boards

```http
GET /v1/dream-boards
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (`active`, `funded`, `closed`, etc.) |
| `limit` | integer | Results per page (default: 20, max: 100) |
| `after` | string | Cursor for pagination |

**Response:** `200 OK`
```json
{
  "data": [
    { "id": "db_xxx", "slug": "...", ... },
    { "id": "db_yyy", "slug": "...", ... }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "cursor_abc123"
  }
}
```

#### Update Dream Board

```http
PATCH /v1/dream-boards/{id}
```

**Request Body** (partial update):
```json
{
  "message": "Updated message",
  "deadline": "2026-02-20T23:59:59Z"
}
```

**Updatable Fields:**
- `message`
- `deadline` (can only extend, not shorten)
- `status` (only certain transitions allowed)

**Response:** `200 OK` with updated Dream Board

#### Close Dream Board

```http
POST /v1/dream-boards/{id}/close
```

**Request Body:**
```json
{
  "reason": "manual"  // or "deadline_reached", "goal_reached"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": "db_abc123",
    "status": "closed",
    "raised_cents": 125000,
    "payouts": [
      {
        "id": "po_xyz789",
        "type": "takealot_gift_card",
        "status": "pending",
        "net_cents": 121250  // After fees
      }
    ]
  }
}
```

---

### Contributions

#### List Contributions

```http
GET /v1/dream-boards/{id}/contributions
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by payment status |
| `limit` | integer | Results per page |
| `after` | string | Pagination cursor |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "con_abc123",
      "dream_board_id": "db_xyz789",
      "contributor_name": "Sarah M.",
      "message": "Happy birthday Maya!",
      "amount_cents": 20000,
      "fee_cents": 600,
      "net_cents": 19400,
      "payment_status": "completed",
      "created_at": "2026-01-22T14:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### Get Contribution

```http
GET /v1/contributions/{id}
```

**Response:** `200 OK` with contribution details

---

### Payouts

**Note:** A Dream Board can have multiple payouts (gift + charity overflow).

#### List Pending Payouts

For partners to poll for payouts they need to execute.

```http
GET /v1/payouts/pending
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by payout type |
| `limit` | integer | Results per page |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "po_abc123",
      "dream_board_id": "db_xyz789",
      "type": "takealot_gift_card",
      "gross_cents": 125000,
      "fee_cents": 3750,
      "net_cents": 121250,
      "status": "pending",
      "recipient_data": {
        "email": "parent@example.com",
        "product_url": "https://www.takealot.com/..."
      },
      "created_at": "2026-01-25T10:00:00Z"
    }
  ]
}
```

#### Get Payout

```http
GET /v1/payouts/{id}
```

**Response:** `200 OK` with payout details

#### Confirm Payout

For partners to confirm they've executed a payout.

```http
POST /v1/payouts/{id}/confirm
```

**Request Body:**
```json
{
  "external_ref": "TKL_GC_12345",  // Partner's reference
  "completed_at": "2026-01-25T11:30:00Z"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": "po_abc123",
    "status": "completed",
    "external_ref": "TKL_GC_12345",
    "completed_at": "2026-01-25T11:30:00Z"
  }
}
```

#### Report Payout Failure

```http
POST /v1/payouts/{id}/fail
```

**Request Body:**
```json
{
  "error_code": "INSUFFICIENT_STOCK",
  "error_message": "Product no longer available"
}
```

**Response:** `200 OK` with updated payout status

---

### Webhooks

#### Register Webhook Endpoint

```http
POST /v1/webhooks
```

**Request Body:**
```json
{
  "url": "https://partner.com/webhooks/chipin",
  "events": ["contribution.received", "pot.closed", "payout.ready"],
  "secret": "whsec_abc123..."  // For signature verification
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "wh_abc123",
    "url": "https://partner.com/webhooks/chipin",
    "events": ["contribution.received", "pot.closed", "payout.ready"],
    "is_active": true,
    "created_at": "2026-01-21T10:00:00Z"
  }
}
```

#### List Webhook Endpoints

```http
GET /v1/webhooks
```

#### Delete Webhook Endpoint

```http
DELETE /v1/webhooks/{id}
```

---

## Webhook Events

ChipIn pushes events to registered webhook endpoints.

### Event Format

```json
{
  "id": "evt_abc123def456",
  "type": "contribution.received",
  "created_at": "2026-01-22T14:30:00Z",
  "data": {
    "contribution": {
      "id": "con_xyz789",
      "dream_board_id": "db_abc123",
      "amount_cents": 20000,
      ...
    },
    "dream_board": {
      "id": "db_abc123",
      "slug": "maya-7th-birthday-x7k9m2",
      "raised_cents": 145000,
      "goal_cents": 249900,
      ...
    }
  }
}
```

### Event Types

| Event | Description | Payload |
|-------|-------------|---------|
| `dreamboard.created` | New Dream Board created | Dream Board object |
| `dreamboard.updated` | Dream Board updated | Dream Board object |
| `contribution.received` | Successful contribution | Contribution + Dream Board |
| `pot.funded` | Goal amount reached | Dream Board object |
| `pot.closed` | Dream Board closed | Dream Board object |
| `payout.ready` | Payout ready for execution | Payout object |
| `payout.completed` | Payout confirmed complete | Payout object |
| `payout.failed` | Payout failed | Payout object + error |

### Webhook Signature Verification

All webhook requests include a signature header:

```http
X-ChipIn-Signature: t=1706140800,v1=abc123...
```

**Verification Process:**

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const [timestamp, hash] = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return false;
  }

  // Verify signature
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedHash)
  );
}
```

### Webhook Retry Policy

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 12 hours |
| 7 | 24 hours |

After 7 failed attempts, the webhook is marked as failed and requires manual retry.

---

## Internal API Endpoints

These endpoints are used by the ChipIn frontend, not exposed to partners.

### Authentication

#### Send Magic Link

```http
POST /api/internal/auth/magic-link
```

```json
{
  "email": "parent@example.com"
}
```

#### Verify Magic Link

```http
GET /api/internal/auth/verify?token=xxx
```

Sets session cookie on success.

#### Get Current User

```http
GET /api/internal/auth/me
```

### Image Upload

```http
POST /api/internal/upload
Content-Type: multipart/form-data

file: [binary]
```

**Response:**
```json
{
  "url": "https://storage.chipin.co.za/photos/abc123.jpg"
}
```

### Product Search

```http
GET /api/internal/products/search?q=lego+star+wars
```

**Response:**
```json
{
  "data": [
    {
      "id": "PLID12345",
      "name": "LEGO Star Wars Death Star",
      "price_cents": 249900,
      "image_url": "https://media.takealot.com/...",
      "product_url": "https://www.takealot.com/..."
    }
  ]
}
```

### Product Fetch (by URL)

```http
POST /api/internal/products/fetch
```

```json
{
  "url": "https://www.takealot.com/lego-star-wars-death-star/PLID12345"
}
```

**Response:**
```json
{
  "data": {
    "id": "PLID12345",
    "name": "LEGO Star Wars Death Star",
    "price_cents": 249900,
    "image_url": "https://media.takealot.com/...",
    "product_url": "https://www.takealot.com/...",
    "in_stock": true
  }
}
```

---

## Payment Provider Webhooks

These endpoints receive callbacks from payment providers.

### PayFast Webhook

```http
POST /api/webhooks/payfast
```

Receives ITN (Instant Transaction Notification) from PayFast.

### Ozow Webhook

```http
POST /api/webhooks/ozow
```

Receives payment notification from Ozow.

### SnapScan Webhook

```http
POST /api/webhooks/snapscan
```

Receives payment notification from SnapScan.

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { ChipInClient } from '@chipin/sdk';

const chipin = new ChipInClient({
  apiKey: 'cpk_live_xxx',
});

// Create Dream Board
const dreamBoard = await chipin.dreamBoards.create({
  childName: 'Maya',
  childPhotoUrl: 'https://...',
  giftType: 'takealot_product',
  giftData: {
    productUrl: 'https://www.takealot.com/...',
    productName: 'LEGO Death Star',
    productImage: 'https://...',
    productPrice: 249900,
  },
  goalCents: 249900,
  deadline: new Date('2026-02-14'),
  payoutEmail: 'parent@example.com',
});

// Get Dream Board
const board = await chipin.dreamBoards.get('db_abc123');

// List contributions
const contributions = await chipin.contributions.list('db_abc123');

// Confirm payout
await chipin.payouts.confirm('po_xyz789', {
  externalRef: 'TKL_GC_12345',
});
```

### cURL Examples

```bash
# Create Dream Board
curl -X POST https://api.chipin.co.za/v1/dream-boards \
  -H "Authorization: Bearer cpk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "child_name": "Maya",
    "gift_type": "takealot_product",
    ...
  }'

# Get Dream Board
curl https://api.chipin.co.za/v1/dream-boards/db_abc123 \
  -H "Authorization: Bearer cpk_live_xxx"

# Confirm payout
curl -X POST https://api.chipin.co.za/v1/payouts/po_xyz789/confirm \
  -H "Authorization: Bearer cpk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"external_ref": "TKL_GC_12345"}'
```

---

## OpenAPI Specification

Full OpenAPI 3.0 specification available at:

```
https://api.chipin.co.za/v1/openapi.json
https://api.chipin.co.za/v1/docs  (Swagger UI)
```

---

## Document References

| Document | Purpose |
|----------|---------|
| [DATA.md](./DATA.md) | Data models backing these endpoints |
| [PAYMENTS.md](./PAYMENTS.md) | Payment flow details |
| [SECURITY.md](./SECURITY.md) | API security requirements |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Third-party integration patterns |
