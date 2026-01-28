# ChipIn Data Models

> **Version:** 1.0.0  
> **Last Updated:** January 28, 2026  
> **Status:** Ready for Development

---

## Overview

ChipIn uses PostgreSQL (via Neon) with Drizzle ORM. This document defines all data models, relationships, and constraints.

---

## Entity Relationship Diagram

```
┌─────────────────┐        ┌─────────────────┐
│    partners     │        │      hosts      │
├─────────────────┤        ├─────────────────┤
│ id (PK)         │        │ id (PK)         │
│ name (unique)   │        │ email (unique)  │
│ created_at      │        │ created_at      │
└───────┬─────────┘        └───────┬─────────┘
        │ 1:N                      │ 1:N
        │                          │
        ├───────────────┐          │
        ▼               ▼          ▼
┌─────────────────┐  ┌─────────────────┐
│    api_keys     │  │  dream_boards   │
├─────────────────┤  ├─────────────────┤
│ id (PK)         │  │ id (PK)         │
│ partner_id (FK) │  │ partner_id (FK) │
│ key_hash        │  │ host_id (FK)    │
│ scopes[]        │  │ slug (unique)   │
│ rate_limit      │  │ gift_type       │
└───────┬─────────┘  │ goal_cents      │
        │ 1:N        └───────┬─────────┘
        ▼                    │ 1:N
┌────────────────────┐       ▼
│ webhook_endpoints  │  ┌─────────────────┐
├────────────────────┤  │  contributions  │
│ id (PK)            │  ├─────────────────┤
│ api_key_id (FK)    │  │ id (PK)         │
│ url                │  │ partner_id (FK) │
│ events[]           │  │ dream_board_id  │
└─────────┬──────────┘  │ payment_status  │
          │ 1:N          └───────┬─────────┘
          ▼                      │ 1:N
┌─────────────────┐              ▼
│ webhook_events  │       ┌─────────────────┐
├─────────────────┤       │     payouts     │
│ id (PK)         │       ├─────────────────┤
│ api_key_id (FK) │       │ id (PK)         │
│ event_type      │       │ partner_id (FK) │
│ status          │       │ dream_board_id  │
└─────────────────┘       │ type            │
                          └───────┬─────────┘
                                  │ 1:N
                                  ▼
                           ┌─────────────────┐
                           │  payout_items   │
                           ├─────────────────┤
                           │ id (PK)         │
                           │ payout_id (FK)  │
                           │ type            │
                           │ amount_cents    │
                           └─────────────────┘

┌─────────────────┐
│   audit_logs    │
├─────────────────┤
│ id (PK)         │
│ actor_type      │
│ action          │
│ target_type/id  │
│ created_at      │
└─────────────────┘
```

---

## Table Definitions

### hosts

Stores authenticated users who create Dream Boards.

```sql
CREATE TABLE hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hosts_email ON hosts(email);
```

**Drizzle Schema:**

```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const hosts = pgTable('hosts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Field Details:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Host's email address |
| name | VARCHAR(100) | nullable | Host's display name |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() | Account creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, default NOW() | Last update time |

---

### partners

Partners represent tenants for public API access and data isolation. All records exposed via the public API are scoped to a partner.

```sql
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_partners_name ON partners(name);
```

**Drizzle Schema:**

```typescript
import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const partners = pgTable(
  'partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: uniqueIndex('unique_partners_name').on(table.name),
  })
);
```

### dream_boards

Core entity representing a child's birthday gift funding page.

```sql
CREATE TYPE dream_board_status AS ENUM (
  'draft',
  'active', 
  'funded',
  'closed',
  'paid_out',
  'expired',
  'cancelled'
);

CREATE TYPE gift_type AS ENUM (
  'takealot_product',
  'philanthropy'
);

CREATE TYPE payout_method AS ENUM (
  'takealot_gift_card',
  'karri_card_topup',
  'philanthropy_donation'
);

CREATE TABLE dream_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  
  -- Child details
  child_name VARCHAR(50) NOT NULL,
  child_photo_url TEXT NOT NULL,
  birthday_date DATE NOT NULL,
  
  -- Gift details
  gift_type gift_type NOT NULL,
  gift_data JSONB NOT NULL,
  goal_cents INTEGER NOT NULL,
  payout_method payout_method NOT NULL,
  overflow_gift_data JSONB, -- Required for takealot_product
  karri_card_number TEXT,

  -- Content
  message TEXT,
  
  -- Timing
  deadline TIMESTAMPTZ NOT NULL,
  
  -- Status
  status dream_board_status NOT NULL DEFAULT 'draft',
  
  -- Payout details (private)
  payout_email VARCHAR(255) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_goal CHECK (goal_cents >= 2000), -- Minimum R20 goal
  CONSTRAINT valid_deadline CHECK (deadline > created_at),
  CONSTRAINT payout_method_valid CHECK (
    (gift_type = 'takealot_product' AND payout_method IN ('takealot_gift_card', 'karri_card_topup')) OR
    (gift_type = 'philanthropy' AND payout_method = 'philanthropy_donation')
  ),
  CONSTRAINT karri_card_required CHECK (
    (payout_method != 'karri_card_topup' OR karri_card_number IS NOT NULL)
  ),
  CONSTRAINT overflow_required CHECK (
    (gift_type = 'takealot_product' AND overflow_gift_data IS NOT NULL) OR
    (gift_type = 'philanthropy')
  )
);

CREATE INDEX idx_dream_boards_host ON dream_boards(host_id);
CREATE INDEX idx_dream_boards_partner ON dream_boards(partner_id);
CREATE INDEX idx_dream_boards_slug ON dream_boards(slug);
CREATE INDEX idx_dream_boards_status ON dream_boards(status);
CREATE INDEX idx_dream_boards_deadline ON dream_boards(deadline) WHERE status = 'active';
```

**Drizzle Schema:**

```typescript
import { pgTable, uuid, varchar, text, integer, timestamp, date, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const dreamBoardStatusEnum = pgEnum('dream_board_status', [
  'draft', 'active', 'funded', 'closed', 'paid_out', 'expired', 'cancelled'
]);

export const giftTypeEnum = pgEnum('gift_type', [
  'takealot_product', 'philanthropy'
]);

export const payoutMethodEnum = pgEnum('payout_method', [
  'takealot_gift_card', 'karri_card_topup', 'philanthropy_donation'
]);

export const dreamBoards = pgTable('dream_boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull().references(() => partners.id, { onDelete: 'restrict' }),
  hostId: uuid('host_id').notNull().references(() => hosts.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  
  // Child details
  childName: varchar('child_name', { length: 50 }).notNull(),
  childPhotoUrl: text('child_photo_url').notNull(),
  birthdayDate: date('birthday_date').notNull(),
  
  // Gift details
  giftType: giftTypeEnum('gift_type').notNull(),
  giftData: jsonb('gift_data').notNull(),
  goalCents: integer('goal_cents').notNull(),
  payoutMethod: payoutMethodEnum('payout_method').notNull(),
  overflowGiftData: jsonb('overflow_gift_data'),
  karriCardNumber: text('karri_card_number'),
  
  // Content
  message: text('message'),
  
  // Timing
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  
  // Status
  status: dreamBoardStatusEnum('status').notNull().default('draft'),
  
  // Payout details
  payoutEmail: varchar('payout_email', { length: 255 }).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**gift_data JSON Structures:**

```typescript
// For gift_type = 'takealot_product'
interface TakealotGiftData {
  type: 'takealot_product';
  productUrl: string;
  productId?: string;      // If we can extract it
  productName: string;
  productImage: string;
  productPrice: number;    // In cents, at time of selection
}

// For gift_type = 'philanthropy'
interface PhilanthropyGiftData {
  type: 'philanthropy';
  causeId: string;
  causeName: string;
  causeDescription: string;
  causeImage: string;
  impactDescription: string;  // e.g., "Feed 10 children for a week"
}

type GiftData = TakealotGiftData | PhilanthropyGiftData;

// Charity overflow shown after gift is funded (required when gift_type = 'takealot_product')
interface OverflowGiftData {
  causeId: string;
  causeName: string;
  impactDescription: string;
}
```

---

### contributions

Tracks individual contributions to Dream Boards.

```sql
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
);

CREATE TYPE payment_provider AS ENUM (
  'payfast',
  'ozow',
  'snapscan'
);

CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  dream_board_id UUID NOT NULL REFERENCES dream_boards(id) ON DELETE CASCADE,
  
  -- Contributor details (optional)
  contributor_name VARCHAR(100),
  message TEXT,
  
  -- Payment details
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL GENERATED ALWAYS AS (amount_cents - fee_cents) STORED,
  
  payment_provider payment_provider NOT NULL,
  payment_ref VARCHAR(255) NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  
  -- Metadata (for fraud detection, not displayed)
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount_cents >= 2000), -- Minimum R20
  CONSTRAINT unique_payment_ref UNIQUE (payment_provider, payment_ref)
);

CREATE INDEX idx_contributions_dream_board ON contributions(dream_board_id);
CREATE INDEX idx_contributions_partner ON contributions(partner_id);
CREATE INDEX idx_contributions_status ON contributions(payment_status);
CREATE INDEX idx_contributions_pending_processing ON contributions(payment_status, created_at)
  WHERE payment_status IN ('pending', 'processing');
CREATE INDEX idx_contributions_payment_ref ON contributions(payment_provider, payment_ref);
```

**Drizzle Schema:**

```typescript
import { pgTable, uuid, varchar, text, integer, timestamp, inet, pgEnum } from 'drizzle-orm/pg-core';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 'processing', 'completed', 'failed', 'refunded'
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'payfast', 'ozow', 'snapscan'
]);

export const contributions = pgTable('contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull().references(() => partners.id, { onDelete: 'restrict' }),
  dreamBoardId: uuid('dream_board_id').notNull().references(() => dreamBoards.id, { onDelete: 'cascade' }),
  
  // Contributor details
  contributorName: varchar('contributor_name', { length: 100 }),
  message: text('message'),
  
  // Payment details
  amountCents: integer('amount_cents').notNull(),
  feeCents: integer('fee_cents').notNull(),
  // netCents is computed column in DB
  
  paymentProvider: paymentProviderEnum('payment_provider').notNull(),
  paymentRef: varchar('payment_ref', { length: 255 }).notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  
  // Metadata
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

---

### payouts

Tracks payout execution for closed Dream Boards. A Dream Board can have **multiple payouts** (gift + optional charity overflow).

```sql
CREATE TYPE payout_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

CREATE TYPE payout_type AS ENUM (
  'takealot_gift_card',
  'philanthropy_donation',
  'karri_card_topup'
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  dream_board_id UUID NOT NULL REFERENCES dream_boards(id),
  
  -- Payout details
  type payout_type NOT NULL,
  gross_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL,
  
  -- Recipient details (encrypted/hashed sensitive data)
  recipient_data JSONB NOT NULL,
  
  -- Status
  status payout_status NOT NULL DEFAULT 'pending',
  external_ref VARCHAR(255),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_amounts CHECK (gross_cents >= net_cents AND net_cents >= 0)
);

CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_dream_board ON payouts(dream_board_id);
CREATE INDEX idx_payouts_partner ON payouts(partner_id);
```

**Drizzle Schema:**

```typescript
export const payoutStatusEnum = pgEnum('payout_status', [
  'pending', 'processing', 'completed', 'failed'
]);

export const payoutTypeEnum = pgEnum('payout_type', [
  'takealot_gift_card', 'philanthropy_donation', 'karri_card_topup'
]);

export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull().references(() => partners.id, { onDelete: 'restrict' }),
  dreamBoardId: uuid('dream_board_id').notNull().references(() => dreamBoards.id),
  
  // Payout details
  type: payoutTypeEnum('type').notNull(),
  grossCents: integer('gross_cents').notNull(),
  feeCents: integer('fee_cents').notNull(),
  netCents: integer('net_cents').notNull(),
  
  // Recipient details
  recipientData: jsonb('recipient_data').notNull(),
  
  // Status
  status: payoutStatusEnum('status').notNull().default('pending'),
  externalRef: varchar('external_ref', { length: 255 }),
  errorMessage: text('error_message'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
```

**recipient_data JSON Structures:**

```typescript
// For type = 'takealot_gift_card'
interface TakealotPayoutData {
  email: string;          // Where to send gift card
  productUrl?: string;    // Optional: specific product URL
}

// For type = 'philanthropy_donation'
interface PhilanthropyPayoutData {
  causeId: string;
  donorName: string;      // Child's name for donation certificate
  donorEmail: string;     // Where to send confirmation
}

// For type = 'karri_card_topup'
interface KarriCardPayoutData {
  cardNumber: string;     // Encrypted
  cardholderName: string;
}
```

---

### payout_items

Payout items break a payout into ledger-style components (e.g., gift vs overflow).

```sql
CREATE TYPE payout_item_type AS ENUM ('gift', 'overflow');

CREATE TABLE payout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  dream_board_id UUID NOT NULL REFERENCES dream_boards(id) ON DELETE CASCADE,
  type payout_item_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_payout_item_amount CHECK (amount_cents >= 0)
);

CREATE INDEX idx_payout_items_payout ON payout_items(payout_id);
CREATE INDEX idx_payout_items_dream_board ON payout_items(dream_board_id);
CREATE INDEX idx_payout_items_type ON payout_items(type);
CREATE UNIQUE INDEX unique_payout_item_type ON payout_items(payout_id, type);
```

---

### audit_logs

Audit log table for security-sensitive and money-adjacent actions.

```sql
CREATE TYPE audit_actor_type AS ENUM ('admin', 'host', 'system');

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type audit_actor_type NOT NULL,
  actor_id UUID,
  actor_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
```

---

### api_keys

Stores API keys for partner integrations.

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  partner_name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
  key_prefix VARCHAR(12) NOT NULL, -- e.g., "cpk_live_abc"
  scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit INTEGER NOT NULL DEFAULT 1000, -- requests per hour
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_partner ON api_keys(partner_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
```

---

### magic_links

Magic links are stored in **Vercel KV** (no database table in MVP).

---

### webhook_endpoints

Partner-managed webhook subscriptions. Endpoints are created and managed via the public API.

```sql
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_endpoints_api_key ON webhook_endpoints(api_key_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active) WHERE is_active = true;
```

---

### webhook_events

Audit log for outgoing webhooks to partners.

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_response_code INTEGER,
  last_response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_status ON webhook_events(status) WHERE status = 'pending';
CREATE INDEX idx_webhook_events_api_key ON webhook_events(api_key_id);
```

---

## Computed Fields & Views

### Dream Board with Totals

```sql
CREATE VIEW dream_boards_with_totals AS
SELECT 
  db.*,
  COALESCE(SUM(c.net_cents) FILTER (WHERE c.payment_status = 'completed'), 0) as raised_cents,
  COUNT(c.id) FILTER (WHERE c.payment_status = 'completed') as contribution_count,
  GREATEST(
    COALESCE(SUM(c.net_cents) FILTER (WHERE c.payment_status = 'completed'), 0) - db.goal_cents,
    0
  ) as overflow_cents
FROM dream_boards db
LEFT JOIN contributions c ON c.dream_board_id = db.id
GROUP BY db.id;
```

### Active Dream Boards Expiring Soon

```sql
CREATE VIEW expiring_dream_boards AS
SELECT * FROM dream_boards
WHERE status = 'active'
  AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY deadline ASC;
```

---

## Data Privacy Classifications

| Table | Field | Classification | Retention |
|-------|-------|----------------|-----------|
| hosts | email | PII | Account lifetime |
| hosts | name | PII | Account lifetime |
| dream_boards | child_name | PII (Minor) | Board lifetime + 90 days |
| dream_boards | child_photo_url | PII (Minor) | Board lifetime + 90 days |
| dream_boards | payout_email | PII | Board lifetime + 90 days |
| dream_boards | overflow_gift_data | Non-PII | Board lifetime + 90 days |
| contributions | contributor_name | PII | Board lifetime + 90 days |
| contributions | ip_address | PII | 30 days (fraud detection) |
| contributions | user_agent | Metadata | 30 days |
| payouts | recipient_data | PII (encrypted) | 7 years (financial records) |

### Data Retention Policy

1. **Active Dream Boards:** Retained indefinitely
2. **Closed Dream Boards:** Retained for 90 days, then anonymized
3. **Contribution IP/User Agent:** Deleted after 30 days
4. **Payout Records:** Retained for 7 years (legal requirement)
5. **Magic Links:** Stored in KV; auto-expire after use/TTL

### Anonymization Process

After 90 days post-closure:
```sql
UPDATE dream_boards 
SET 
  child_name = 'Anonymized',
  child_photo_url = '/images/anonymized.png',
  payout_email = 'anonymized@chipin.co.za',
  message = NULL
WHERE status IN ('paid_out', 'cancelled', 'expired')
  AND updated_at < NOW() - INTERVAL '90 days';

UPDATE contributions
SET 
  contributor_name = 'Anonymous',
  message = NULL,
  ip_address = NULL,
  user_agent = NULL
WHERE dream_board_id IN (
  SELECT id FROM dream_boards 
  WHERE status IN ('paid_out', 'cancelled', 'expired')
    AND updated_at < NOW() - INTERVAL '90 days'
);
```

---

## Indexes Strategy

### Query Patterns & Indexes

| Query Pattern | Index |
|--------------|-------|
| Find Dream Board by slug | `idx_dream_boards_slug` |
| List host's Dream Boards | `idx_dream_boards_host` |
| Find active boards expiring soon | `idx_dream_boards_deadline` (partial) |
| Look up payment by provider ref | `idx_contributions_payment_ref` |
| List contributions for board | `idx_contributions_dream_board` |
| Find pending payouts | `idx_payouts_status` |

---

## Migration Strategy

### Initial Migration

```sql
-- 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
CREATE TYPE dream_board_status AS ENUM (...);
CREATE TYPE gift_type AS ENUM (...);
CREATE TYPE payout_method AS ENUM (...);
CREATE TYPE payment_status AS ENUM (...);
CREATE TYPE payment_provider AS ENUM (...);
CREATE TYPE payout_status AS ENUM (...);
CREATE TYPE payout_type AS ENUM (...);
CREATE TYPE payout_item_type AS ENUM (...);
CREATE TYPE audit_actor_type AS ENUM (...);

-- Create tables
CREATE TABLE partners (...);
CREATE TABLE hosts (...);
CREATE TABLE dream_boards (...);
CREATE TABLE contributions (...);
CREATE TABLE payouts (...);
CREATE TABLE payout_items (...);
CREATE TABLE audit_logs (...);
CREATE TABLE api_keys (...);
CREATE TABLE webhook_endpoints (...);
CREATE TABLE webhook_events (...);

-- Create indexes
CREATE INDEX ...;

-- Create views
CREATE VIEW dream_boards_with_totals AS ...;
```

### Running Migrations

```bash
# Using Drizzle
pnpm drizzle:generate
pnpm drizzle:push

# Or with raw SQL
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

---

## Document References

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture overview |
| [API.md](./API.md) | API endpoints using these models |
| [SECURITY.md](./SECURITY.md) | Data security requirements |
