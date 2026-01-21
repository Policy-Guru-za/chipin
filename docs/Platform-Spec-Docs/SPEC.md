# ChipIn Product Specification

> **Version:** 1.0.0  
> **Last Updated:** January 2026  
> **Status:** Ready for Development

---

## Executive Summary

ChipIn is a social gifting platform that transforms children's birthday gift-giving from chaotic cash requests into meaningful contributions toward a child's dream gift.

**The One-Sentence Pitch:**
> Friends chip in together to turn birthday clutter into one dream gift.

---

## The Problem We Solve

Parents face three acute pain points around birthday gifts:

1. **Host Clutter & Waste** — Houses overflow with plastic toys discarded within weeks
2. **Guest Anxiety** — "Gifter's block" about what to buy, how much to spend, fear of duplicates
3. **The Taboo of Cash** — Parents prefer cash but feel it's "tacky" to ask directly

**The Verdict:** Parents want to pool money, but they lack a socially acceptable digital tool to do it.

---

## The Solution

ChipIn provides a **Dream Board** — a single, specific gift goal that guests contribute toward. The psychological reframe is critical:

| Old Framing | ChipIn Framing |
|-------------|----------------|
| "Please give us cash" | "Contribute to Maya's Dream Bike Fund" |
| Feels greedy | Feels personal and intentional |
| Guest gives generic amount | Guest "buys a piece" of the specific item |

---

## Core Product Principles

### 1. One Dream Gift, Not a Registry
This is not a wedding registry. Each Dream Board has **one item** — a single, focused goal that creates urgency and clarity.

### 2. Mobile Web First
60-80% of guests won't download an app. The guest experience is **entirely browser-based** — click link, view, contribute, done. Zero friction.

### 3. Takealot-First Gift, Flexible Payout
Default gift goal is a Takealot product, with payout via Takealot gift card **or** Karri Card top-up. This creates:
- Perfect alignment (child gets exactly what they wished for)
- Potential affiliate revenue (5-10% commission)
- Regulatory simplicity (gift cards or regulated card top-ups)
  
If the gift is fully funded early, guests see a **charity overflow** view instead of the gift.

### 4. API-First Architecture
ChipIn exposes APIs that partners integrate with — not the reverse. We control the product; partners adapt to us.

### 5. Privacy by Default
- Child's first name only (no surnames)
- Contribution amounts not displayed publicly
- Contributor names optional
- No class roster uploads (POPIA compliance)

---

## Feature Scope

### MVP Features (v1.0)

| Feature | Description | Priority |
|---------|-------------|----------|
| Dream Board Creation | Host creates board with child photo, name, one gift item | P0 |
| Takealot Product Selection | Search and select specific Takealot product as dream gift | P0 |
| Charity Overflow Selection | Host selects a charity shown after gift is funded | P0 |
| Shareable Link Generation | Unique URL for distribution via any channel | P0 |
| Guest Contribution Flow | Mobile web experience for viewing and contributing | P0 |
| Payment Processing | Accept contributions via PayFast, Ozow, SnapScan | P0 |
| Contribution Tracking | Progress bar, contributor list (names only, no amounts) | P0 |
| Pot Closure & Payout | Automatic/manual closure, Takealot gift card or Karri top-up | P0 |
| Host Dashboard | View contributions, manage Dream Board, trigger payout | P0 |

### Post-MVP Features (v1.x)

| Feature | Description | Priority |
|---------|-------------|----------|
| Philanthropic Gifting | "Gift of Giving" option — donate to curated causes | P1 |
| Karri Card Payout | Optional payout to child's Karri Card | P1 |
| Custom Thank You Messages | Host sends personalized thanks to contributors | P1 |
| Photo Gallery | Post-party photos showing child with gift | P2 |
| Recurring Events | "Set up next year's birthday" prompt | P2 |
| Class Circle | Optional persistent group for repeat invitations | P2 |

### Explicitly Out of Scope

| Feature | Reason |
|---------|--------|
| Shared Calendar | Research shows this is a "vitamin" — low retention, network effect trap |
| Party Planning Tools | We're a gifting wallet, not a party planner |
| Native Mobile Apps | Mobile web is sufficient; apps add friction for guests |
| Multiple Gift Items | One item creates focus and urgency; registry behavior dilutes this |
| Social Feed / Timeline | We're not building a social network |
| Chat / Messaging | WhatsApp handles this better than we ever could |

---

## Success Metrics

### Primary Metrics

| Metric | Definition | Target (v1.0) |
|--------|------------|---------------|
| Pot Completion Rate | % of Dream Boards that reach goal or close with funds | >70% |
| Guest Conversion Rate | % of link clicks that result in contribution | >25% |
| Average Pot Size | Mean total contributions per Dream Board | R2,500+ |
| Time to First Contribution | Hours from Dream Board creation to first contribution | <24h |

### Secondary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Host Satisfaction | NPS score from hosts | >50 |
| Guest Satisfaction | Post-contribution rating | >4.5/5 |
| Viral Coefficient | New hosts generated per Dream Board | >0.3 |
| Takealot Conversion | % of payouts as Takealot gift cards | >80% |

---

## User Personas

### Primary: The Host Parent
- **Demographics:** Parent of child aged 3-12, middle-class, urban/suburban SA
- **Behavior:** Active on WhatsApp, comfortable with digital payments
- **Pain:** Drowning in plastic toys, embarrassed to ask for cash
- **Goal:** Meaningful gift their child actually wants, minimal party clutter

### Secondary: The Guest Parent
- **Demographics:** Friend/classmate parent, similar demographics
- **Behavior:** Receives party invites via WhatsApp, decision fatigue on gifts
- **Pain:** Gifter's block, wastes money on irrelevant items
- **Goal:** Easy contribution that feels personal, not transactional

---

## Competitive Positioning

ChipIn occupies a unique position: **purpose-built for parents** + **seamless local payments**.

| Competitor | Position | ChipIn Advantage |
|------------|----------|------------------|
| Evite | Legacy digital invites | No SA payments, heavy ads, dated |
| Partiful | Gen Z party pages | Nightlife focus, no parent features |
| ECHOage | Charity + gifting (Canada) | Rigid 50/50 model, ~15% fees, not in SA |
| WhatsApp | Default class comms | No payment tracking, no gift context |
| Bank Transfer | Manual EFT | Awkward to request, no event context |

---

## Technical Constraints

### Regulatory
- No holding of funds beyond payment provider escrow
- POPIA compliance for all personal data
- PCI-DSS compliance via payment provider (not us)

### Performance
- Guest page load: <2 seconds on 3G
- Payment completion: <10 seconds
- 99.9% uptime target

### Scale
- Support 10,000 concurrent Dream Boards
- Handle 100 contributions/minute at peak
- 1M+ total contributions in Year 1

---

## Revenue Model

### Primary Revenue: Transaction Fees
- **3% fee** on all contributions
- Transparent to guests (shown before payment)
- Covers payment provider fees (~2%) + margin (~1%)

### Secondary Revenue: Affiliate Commissions
- **5-10% commission** on Takealot gift card redemptions
- Not visible to users — built into gift card issuance
- Potential for similar arrangements with other retailers

### Future Revenue Streams
- Premium features (custom branding, extended deadlines)
- Sponsored gift suggestions
- B2B venue partnerships

---

## Go-to-Market Strategy

### Phase 1: Seed (Months 1-3)
- 100 Dream Boards from founder's network
- Iterate based on feedback
- Target: 70%+ pot completion rate

### Phase 2: Organic Growth (Months 4-6)
- Each party invites 15-25 guests
- Guests become future hosts
- Target: 0.3+ viral coefficient

### Phase 3: Partnerships (Months 7-12)
- School partnerships (if Karri relationship develops)
- Venue partnerships (party venues offer ChipIn to customers)
- Influencer seeding (parenting bloggers/instagrammers)

---

## Dependencies & Risks

### Critical Dependencies
| Dependency | Risk Level | Mitigation |
|------------|------------|------------|
| Takealot product data | Medium | URL-based fallback if API unavailable |
| Payment providers | Low | Multiple providers (PayFast, Ozow, SnapScan) |
| Vercel/Neon availability | Low | Standard cloud SLAs |

### Key Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low adoption | Medium | High | Strong UX, viral mechanics, founder network seeding |
| Takealot blocks integration | Low | Medium | URL-based product linking as fallback |
| Payment fraud | Medium | Medium | Provider fraud detection + our own rules |
| Regulatory change | Low | High | Gift card model has favorable treatment |

---

## Glossary

| Term | Definition |
|------|------------|
| **Dream Board** | The single-page representation of a child's birthday gift goal |
| **Dream Gift** | The one item (Takealot product or philanthropic cause) being funded |
| **Pot** | The accumulated contributions toward a Dream Gift |
| **Host** | The parent creating the Dream Board |
| **Guest** | A party invitee who may contribute |
| **Payout** | The disbursement of pot funds (as gift card or donation) |

---

## Document References

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical system architecture |
| [JOURNEYS.md](./JOURNEYS.md) | Detailed user journeys |
| [DATA.md](./DATA.md) | Data models and schema |
| [API.md](./API.md) | Public API specification |
| [PAYMENTS.md](./PAYMENTS.md) | Payment flow specifications |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Third-party integration specs |
| [UX.md](./UX.md) | Interface specifications |
| [SECURITY.md](./SECURITY.md) | Security requirements |
| [AGENTS.md](./AGENTS.md) | AI coding agent instructions |
