# ChipIn User Journeys

> **Version:** 1.0.0  
> **Last Updated:** January 2026  
> **Status:** Ready for Development

---

## Overview

ChipIn has two primary user journeys:

1. **Host Journey** — Creating and managing a Dream Board
2. **Guest Journey** — Viewing and contributing to a Dream Board

Both journeys are optimized for mobile-first usage via WhatsApp distribution.

---

## Host Journey: Creating a Dream Board

### Journey Overview

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  LAND   │──▶│  AUTH   │──▶│  CHILD  │──▶│  GIFT   │──▶│ DETAILS │──▶│  SHARE  │
│         │   │         │   │         │   │         │   │         │   │         │
│ Welcome │   │ Magic   │   │ Photo + │   │ Takealot│   │ Payout  │   │ Get     │
│ + CTA   │   │ Link    │   │ Name    │   │ or Give │   │ + Date  │   │ Link    │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### Step 1: Landing & Call to Action

**URL:** `chipin.co.za`

**Screen Elements:**
- Hero headline: "Turn 20 toys into one dream gift"
- Subheadline: "Friends chip in together for your child's birthday"
- Primary CTA: "Create a Dream Board" (large, prominent)
- Secondary: "How it works" (scroll anchor)
- Social proof: "2,500+ dream gifts funded" (once we have data)

**User Action:** Clicks "Create a Dream Board"

**Transition:** → Step 2

---

### Step 2: Authentication (Magic Link)

**URL:** `chipin.co.za/create`

**Screen Elements:**
- Heading: "Let's get started"
- Email input field
- "Send magic link" button
- Helper text: "We'll email you a link to continue"
- Privacy note: "We never share your email"

**User Action:** Enters email, clicks send

**System Action:**
1. Generate magic link token (UUID, 1-hour expiry)
2. Store token in Vercel KV
3. Send email via Resend with link

**Email Content:**
```
Subject: Your ChipIn magic link ✨

Hi there!

Click below to create your Dream Board:

[Continue to ChipIn →]

This link expires in 1 hour.

— The ChipIn Team
```

**Screen After Send:**
- "Check your email!"
- "We sent a link to {email}"
- "Didn't receive it? [Resend]"

**User Action:** Opens email, clicks magic link

**Transition:** → Step 3

---

### Step 3: Child Details

**URL:** `chipin.co.za/create/child`

**Screen Elements:**
- Progress indicator: Step 1 of 4
- Heading: "Who's the birthday star?"

**Form Fields:**

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Child's first name | Text input | 2-30 chars, letters only | Yes |
| Child's photo | Image upload | Max 5MB, jpg/png/webp | Yes |
| Birthday date | Date picker | Future date within 90 days | Yes |

**Photo Upload UX:**
- Tap area shows camera icon + "Add photo"
- Opens native file picker (mobile: camera option)
- Shows circular preview after upload
- "Change photo" option appears

**Validation Messages:**
- "Please enter your child's first name"
- "Please upload a photo of your child"
- "Please select a birthday date"

**User Action:** Fills form, clicks "Continue"

**System Action:**
1. Upload image to Vercel Blob
2. Store child details in session/draft
3. Navigate to next step

**Transition:** → Step 4

---

### Step 4: Dream Gift Selection

**URL:** `chipin.co.za/create/gift`

**Screen Elements:**
- Progress indicator: Step 2 of 4
- Heading: "What's {childName}'s dream gift?"
- Subheading: "Choose one special item to fund"

**Two Options (Tab/Toggle):**

#### Option A: Takealot Product

**Flow:**
```
1. Search input: "Search Takealot for a product"
2. User types product name
3. Show search results (fetched from Takealot)
4. User selects product
5. Product card appears with:
   - Image
   - Name
   - Price (becomes the goal)
   - "Selected ✓" indicator
```

**Takealot Product Card:**
```
┌─────────────────────────────────┐
│  [Product Image]                │
│                                 │
│  LEGO Star Wars Death Star     │
│  R2,499.00                      │
│                                 │
│  [✓ Selected]                   │
└─────────────────────────────────┘
```

**Alternative Flow (URL Paste):**
- "Or paste a Takealot link"
- User pastes URL
- System fetches product details
- Product card appears

**Charity Overflow (required for Takealot gifts):**
- Prompt: "If the gift is fully funded early, which charity should we support?"
- Host selects a cause from curated list
- This charity replaces the gift in guest view once the goal is reached

#### Option B: Gift of Giving (Philanthropic)

**Flow:**
```
1. "Give the gift of giving" toggle/tab
2. Show curated list of causes
3. User selects cause
4. Amount selector (predefined impacts):
   - R250: "Feed 5 children for a week"
   - R500: "School supplies for 10 kids"
   - R1,000: "Sponsor a child's education for a month"
5. Cause card appears with selected impact
```

**Cause Card:**
```
┌─────────────────────────────────┐
│  [Charity Logo]                 │
│                                 │
│  Gift of Learning              │
│  School supplies for 10 kids   │
│  Goal: R500                     │
│                                 │
│  [✓ Selected]                   │
└─────────────────────────────────┘
```

**Validation:**
- Must select one gift option
- "Please choose a dream gift to continue"

**User Action:** Selects gift, clicks "Continue"

**Transition:** → Step 5

---

### Step 5: Payout & Final Details

**URL:** `chipin.co.za/create/details`

**Screen Elements:**
- Progress indicator: Step 3 of 4
- Heading: "Almost done!"

**Form Fields:**

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Payout email | Email input | Valid email format | Yes |
| Payout method | Radio/select | Takealot gift card or Karri Card | Required for Takealot gifts |
| Personal message | Textarea | Max 280 chars | No |
| Contribution deadline | Date picker | 1-90 days from now | Yes |

**Payout Email Explanation:**
- Helper text: "We'll send the payout to this email when the pot closes"
- If payout method is Takealot: "We'll email a Takealot gift card"
- If payout method is Karri: "We'll top up the Karri Card and confirm by email"
- If gift type is philanthropy: "We'll email the donation confirmation"

**Personal Message:**
- Placeholder: "E.g., Maya would love your contribution toward her dream bike!"
- Character counter: "0/280"

**Deadline:**
- Default: Birthday date from Step 3
- Options: "1 week", "2 weeks", "1 month", "Custom"
- Helper: "Contributors will see a countdown"

**User Action:** Fills form, clicks "Review & Create"

**Transition:** → Step 6

---

### Step 6: Review & Share

**URL:** `chipin.co.za/create/review`

**Screen Elements:**
- Progress indicator: Step 4 of 4
- Heading: "Review your Dream Board"

**Preview Card (exactly as guests will see):**
```
┌─────────────────────────────────┐
│        [Child Photo]            │
│                                 │
│    Maya's 7th Birthday          │
│    Dream Gift: LEGO Death Star  │
│                                 │
│    Goal: R2,499                 │
│    ████░░░░░░ R0 raised         │
│                                 │
│    "Maya would love your        │
│     contribution toward her     │
│     dream Lego set!"            │
│                                 │
│    ⏰ Closes in 14 days         │
│                                 │
│    [Contribute →]               │
└─────────────────────────────────┘
```

**Actions:**
- "Edit" links next to each section (→ back to respective step)
- "Create Dream Board" button (primary)

**User Action:** Reviews, clicks "Create Dream Board"

**System Action:**
1. Create Dream Board record in database
2. Generate unique slug: `maya-7th-birthday-{random6chars}`
3. Upload finalized image if needed
4. Set status to 'active'

**Post-Creation Screen:**

**URL:** `chipin.co.za/dashboard/{dreamBoardId}` (or `/success`)

**Screen Elements:**
- 🎉 "Your Dream Board is live!"
- Shareable link in copy-able text box
- Share buttons:
  - "Share via WhatsApp" (deep link)
  - "Copy link"
  - "Share via Email" (mailto)
- Preview of the live Dream Board

**WhatsApp Share Template:**
```
🎂 Maya's 7th Birthday!

Help fund Maya's dream gift — a LEGO Death Star!

👉 chipin.co.za/maya-7th-birthday-abc123

Every contribution helps! 💝
```

---

## Host Journey: Managing a Dream Board

### Dashboard View

**URL:** `chipin.co.za/dashboard`

**Screen Elements:**
- List of host's Dream Boards
- Each card shows:
  - Child name + photo thumbnail
  - Progress: "R1,200 / R2,499 (48%)"
  - Status badge: "Active" / "Funded" / "Closed"
  - Deadline: "5 days left"
  - Contributor count: "8 contributions"

**Actions per Dream Board:**
- "View" → Opens public Dream Board
- "Manage" → Opens management screen

### Management Screen

**URL:** `chipin.co.za/dashboard/{dreamBoardId}`

**Tabs/Sections:**

#### Overview Tab
- Full preview of Dream Board
- Progress visualization
- Quick stats: Total raised, # contributors, days remaining

#### Contributors Tab
- List of contributions:
  ```
  Sarah M.        R200    2 days ago    "Happy birthday Maya!"
  John D.         R150    3 days ago    
  Anonymous       R100    5 days ago    "🎉"
  ```
- Note: Amounts visible to host only, not public

#### Settings Tab
- Edit message
- Extend deadline
- Close pot early
- Cancel Dream Board

#### Payout Tab (appears when pot is closeable)
- "Your pot is ready for payout!"
- Summary: Total raised, fees, payout amount
- Payout method confirmation
- "Request Payout" button

---

## Guest Journey: Contributing to a Dream Board

### Journey Overview

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  CLICK  │──▶│  VIEW   │──▶│ AMOUNT  │──▶│  PAY    │──▶│ THANKS  │
│  LINK   │   │  BOARD  │   │         │   │         │   │         │
│         │   │         │   │ Select  │   │ Payment │   │ Confirm │
│ WhatsApp│   │ Dream   │   │ R100/   │   │ Provider│   │ + Share │
│ etc.    │   │ Board   │   │ R200... │   │         │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### Step 1: Receive & Click Link

**Context:** Guest receives link via WhatsApp, SMS, email, etc.

**Link Format:** `chipin.co.za/maya-7th-birthday-abc123`

**User Action:** Taps link

**Transition:** → Step 2

---

### Step 2: View Dream Board

**URL:** `chipin.co.za/{slug}`

**Screen Elements:**

```
┌─────────────────────────────────────┐
│                                     │
│         ┌─────────────┐             │
│         │             │             │
│         │   [Photo]   │             │
│         │             │             │
│         └─────────────┘             │
│                                     │
│         Maya's 7th Birthday         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [Product Image]               │  │
│  │ LEGO Star Wars Death Star    │  │
│  │ Her dream gift               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░   │
│  48% funded                        │
│                                     │
│  "Maya would love your contribution │
│   toward her dream Lego set!"       │
│                                     │
│  ⏰ 5 days left                     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │      Contribute Now →         │  │
│  └───────────────────────────────┘  │
│                                     │
│  Already contributed:               │
│  Sarah • John • Anonymous + 5 more  │
│                                     │
└─────────────────────────────────────┘
```

**Key Design Principles:**
- Mobile-first (designed for phone screens)
- Loads fast (<2 seconds on 3G)
- No app download prompt
- Clear, single CTA

**User Action:** Taps "Contribute Now"

**Transition:** → Step 3

---

### Step 3: Select Contribution Amount

**Screen Elements (modal or new view):**

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│  Contribute to Maya's Dream Gift    │
│                                     │
│  Choose an amount:                  │
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │  R100   │ │  R200   │ │  R500  │ │
│  └─────────┘ └─────────┘ └────────┘ │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Other amount: R ________        ││
│  └─────────────────────────────────┘│
│                                     │
│  Your name (optional):              │
│  ┌─────────────────────────────────┐│
│  │ ________________________________││
│  └─────────────────────────────────┘│
│  Shown to the family                │
│                                     │
│  Add a message (optional):          │
│  ┌─────────────────────────────────┐│
│  │ ________________________________││
│  │ ________________________________││
│  └─────────────────────────────────┘│
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Continue to Payment →       │  │
│  └───────────────────────────────┘  │
│                                     │
│  🔒 Secure payment by trusted        │
│                                     │
└─────────────────────────────────────┘
```

**Amount Selection:**
- Predefined buttons: R100, R200, R500
- "Other" input for custom amount
- Minimum: R20 (below this, fees eat too much)
- Maximum: R10,000 (fraud prevention)

**Optional Fields:**
- Name: Shown to host + in contributor list
- Message: Shown to host only

**Fee Display:**
- Before payment: "A 3% fee (R6) supports ChipIn"
- Or integrate into amount: "R106 total (includes R6 fee)"

**User Action:** Selects amount, optionally adds name/message, clicks "Continue to Payment"

**System Action:**
1. Create contribution record (status: 'pending')
2. Create payment request with selected provider
3. Redirect to payment provider

**Transition:** → Step 4

---

### Step 4: Payment

**Context:** User is redirected to payment provider (PayFast, Ozow, or SnapScan)

**PayFast Flow:**
1. Redirect to PayFast hosted page
2. User enters card details or selects EFT
3. Payment processed
4. Redirect back to ChipIn

**Ozow Flow:**
1. Redirect to Ozow bank selection
2. User selects bank, logs in
3. Approves payment
4. Redirect back to ChipIn

**SnapScan Flow:**
1. Display QR code
2. User scans with SnapScan app
3. Approves in app
4. Webhook confirms, page updates

**Return URL:** `chipin.co.za/{slug}/thanks?ref={paymentRef}`

---

### Step 5: Thank You & Share

**URL:** `chipin.co.za/{slug}/thanks`

**Success Screen:**
```
┌─────────────────────────────────────┐
│                                     │
│              🎉                     │
│                                     │
│        Thank you, Sarah!            │
│                                     │
│  Your R200 contribution brings      │
│  Maya closer to her dream gift!     │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░   │
│  56% funded                        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Share with friends →        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   View Dream Board            │  │
│  └───────────────────────────────┘  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  💳 Get a Karri Card for your      │
│     child — safe spending,         │
│     parental controls              │
│     [Learn more →]                 │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- Personalized thank you (uses name if provided)
- Updated progress bar (real-time)
- Share CTA (viral loop)
- Optional Karri promo (if partnership active)

**Share Options:**
- WhatsApp share (pre-filled message)
- Copy link
- Other share options

---

## Edge Cases & Error States

### Dream Board Not Found

**URL:** `chipin.co.za/invalid-slug`

**Screen:**
```
┌─────────────────────────────────────┐
│                                     │
│              😕                     │
│                                     │
│     Dream Board not found          │
│                                     │
│  This link may have expired or     │
│  been removed.                      │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Create your own →           │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Dream Board Closed

**Screen:**
```
┌─────────────────────────────────────┐
│                                     │
│         Maya's 7th Birthday         │
│                                     │
│              ✅                     │
│                                     │
│     This Dream Board has closed    │
│                                     │
│  R2,100 was raised toward Maya's   │
│  LEGO Death Star!                   │
│                                     │
│  Want to create your own?          │
│  ┌───────────────────────────────┐  │
│  │   Create a Dream Board →      │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Payment Failed

**Return URL:** `chipin.co.za/{slug}/payment-failed`

**Screen:**
```
┌─────────────────────────────────────┐
│                                     │
│              ❌                     │
│                                     │
│     Payment unsuccessful           │
│                                     │
│  Your payment could not be         │
│  processed. No funds were taken.   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Try again →                 │  │
│  └───────────────────────────────┘  │
│                                     │
│  Having trouble? Contact us        │
│                                     │
└─────────────────────────────────────┘
```

### Gift Fully Funded (Charity Overflow View)

**Screen replaces gift with selected charity:**
```
🎉 Gift fully funded!

Maya chose to support a charity next.

[Charity Name]
R350 raised so far (open-ended)

[Contribute to the charity →]
```

---

## Notification Flows

### Email Notifications

| Event | Recipient | Email Content |
|-------|-----------|---------------|
| Dream Board created | Host | "Your Dream Board is live! Here's your link..." |
| First contribution | Host | "🎉 {name} just contributed R{amount}!" |
| Goal reached | Host | "Amazing! Maya's dream gift is fully funded!" |
| 24h before deadline | Host | "Your Dream Board closes tomorrow" |
| Pot closed | Host | "Your pot has closed. Request your payout." |
| Payout sent | Host | "Your Takealot gift card is on its way!" |

### Optional: Push Notifications (Future)

If host enables browser notifications:
- New contribution received
- Goal reached
- Deadline approaching

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

- All interactive elements keyboard accessible
- Minimum contrast ratio 4.5:1 for text
- Form inputs have visible labels
- Error messages announced to screen readers
- Focus indicators visible
- Alt text for all images

### Mobile Accessibility

- Touch targets minimum 44x44px
- Sufficient spacing between interactive elements
- Readable without zooming (16px base font)
- Works in landscape and portrait

---

## Performance Requirements

### Guest Page (Critical Path)

| Metric | Target |
|--------|--------|
| First Contentful Paint | <1.5s |
| Largest Contentful Paint | <2.5s |
| Time to Interactive | <3.5s |
| Cumulative Layout Shift | <0.1 |

### Optimization Strategies

- Static generation for Dream Board pages (ISR)
- Image optimization via Vercel
- Minimal JavaScript for guest view
- Edge caching for repeated views

---

## Document References

| Document | Purpose |
|----------|---------|
| [UX.md](./UX.md) | Detailed screen specifications |
| [DATA.md](./DATA.md) | Data models for all entities |
| [PAYMENTS.md](./PAYMENTS.md) | Payment flow details |
