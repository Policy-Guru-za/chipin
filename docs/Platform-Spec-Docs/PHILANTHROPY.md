# Philanthropic Giving Integration

> **Status:** Placeholder — requires investigation  
> **Priority:** P1 (post-MVP)

---

## Purpose

Enable "Gift of Giving" option where party guests contribute to a charitable cause instead of a physical gift. Also used as **charity overflow** once a Takealot gift is fully funded.

---

## Concept

Instead of funding a Lego set, the Dream Board could fund:
- "Feed 10 children for a week"
- "School supplies for 5 kids"
- "Plant 20 trees in Maya's name"

This resonates with:
- Eco-conscious parents
- Kids who "have everything"
- Birthday children who want to give back

---

## Potential Partners

### South African Options

| Partner | Type | Notes |
|---------|------|-------|
| **GivenGain** | Giving platform | SA-based, supports many charities |
| **BackaBuddy** | Crowdfunding | SA crowdfunding for causes |
| **MySchool MyVillage** | Loyalty → charity | Existing SA parent awareness |
| **Food Forward SA** | Food rescue | Tangible impact ("fed X children") |
| **Greenpop** | Tree planting | Environmental, visual impact |

### Investigation Required

1. Do any offer APIs for programmatic donations?
2. What are their fee structures?
3. Can donations be made in a child's name?
4. Do they provide donation certificates?
5. Tax implications for donors?

---

## Proposed Interface

```typescript
interface PhilanthropyProvider {
  // Get available causes
  getCauses(): Promise<Cause[]>;
  
  // Get specific cause details
  getCause(id: string): Promise<Cause>;
  
  // Execute donation
  createDonation(params: DonationParams): Promise<Donation>;
}

interface Cause {
  id: string;
  name: string;
  organization: string;
  description: string;
  imageUrl: string;
  impacts: Impact[];
  category: 'education' | 'food' | 'environment' | 'health' | 'animals';
}

interface Impact {
  amount: number;        // Cents
  description: string;   // "Feed 10 children for a week"
}

interface DonationParams {
  causeId: string;
  amount: number;        // Cents
  donorName: string;     // Child's name
  donorEmail: string;    // For certificate delivery
  message?: string;      // Optional dedication
}

interface Donation {
  id: string;
  amount: number;
  certificateUrl?: string;
  receiptUrl?: string;
  status: 'pending' | 'completed' | 'failed';
}
```

---

## MVP Alternative: Curated List

If API integration isn't feasible for MVP, use a curated static list:

```typescript
const CURATED_CAUSES: Cause[] = [
  {
    id: 'food-forward',
    name: 'Feed Hungry Children',
    organization: 'Food Forward SA',
    description: 'Rescue food that would go to waste and deliver it to children in need.',
    imageUrl: '/causes/food-forward.jpg',
    impacts: [
      { amount: 25000, description: 'Feed 5 children for a week' },
      { amount: 50000, description: 'Feed 10 children for a week' },
      { amount: 100000, description: 'Feed 20 children for a week' },
    ],
    category: 'food',
  },
  {
    id: 'greenpop',
    name: 'Plant Trees',
    organization: 'Greenpop',
    description: 'Plant indigenous trees across South Africa.',
    imageUrl: '/causes/greenpop.jpg',
    impacts: [
      { amount: 15000, description: 'Plant 3 trees' },
      { amount: 50000, description: 'Plant 10 trees' },
      { amount: 100000, description: 'Plant a mini forest (20 trees)' },
    ],
    category: 'environment',
  },
  // ... more causes
];
```

For MVP, donations processed manually:
1. Pot closes with philanthropy selection
2. Admin receives alert
3. Admin makes donation on charity website
4. Admin uploads receipt/certificate
5. System emails certificate to host

---

## User Experience

### Host Selection Flow

```
┌─────────────────────────────────────┐
│  What's Maya's dream gift? 🎁       │
│                                     │
│  ┌────────────────┬────────────────┐│
│  │   🛒 Product   │   💝 Gift of   ││
│  │               │    Giving  ←   ││
│  └────────────────┴────────────────┘│
│                                     │
│  Choose a cause:                    │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ [🍎] Feed Hungry Children       ││
│  │ Food Forward SA                 ││
│  │                                 ││
│  │ Impact: Feed 10 children/week   ││
│  │ Goal: R500                      ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ [🌳] Plant Trees                ││
│  │ Greenpop                        ││
│  │                                 ││
│  │ Impact: Plant 10 trees          ││
│  │ Goal: R500                      ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Guest View

```
┌─────────────────────────────────────┐
│         Maya's 7th Birthday         │
│                                     │
│  Instead of gifts, Maya wants to    │
│  give back! 💝                      │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ [Food Forward SA logo]          ││
│  │                                 ││
│  │ "Feed Hungry Children"          ││
│  │                                 ││
│  │ Goal: Feed 20 children for      ││
│  │ a week in Maya's name           ││
│  └─────────────────────────────────┘│
│                                     │
│  ━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░   │
│  R350 of R500 raised (70%)         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │     Contribute Now →          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Tax Considerations

- Section 18A donations are tax-deductible in SA
- Need to clarify if pooled donations qualify
- May need to issue receipts to individual contributors
- Consult tax professional before launch

---

## Next Steps

1. [ ] Research GivenGain API capabilities
2. [ ] Contact BackaBuddy about partnership
3. [ ] Identify 5-10 causes for curated list
4. [ ] Clarify tax/receipt requirements
5. [ ] Design donation certificate template
