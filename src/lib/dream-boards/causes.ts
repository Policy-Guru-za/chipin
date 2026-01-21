export type CauseImpact = {
  amountCents: number;
  description: string;
};

export type Cause = {
  id: string;
  name: string;
  organization: string;
  description: string;
  imageUrl: string;
  impacts: CauseImpact[];
  category: string;
};

export const CURATED_CAUSES: Cause[] = [
  {
    id: 'food-forward',
    name: 'Feed Hungry Children',
    organization: 'Food Forward SA',
    description: 'Rescue food that would go to waste and deliver it to children in need.',
    imageUrl: '/causes/food-forward.jpg',
    impacts: [
      { amountCents: 25000, description: 'Feed 5 children for a week' },
      { amountCents: 50000, description: 'Feed 10 children for a week' },
      { amountCents: 100000, description: 'Feed 20 children for a week' },
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
      { amountCents: 15000, description: 'Plant 3 trees' },
      { amountCents: 50000, description: 'Plant 10 trees' },
      { amountCents: 100000, description: 'Plant a mini forest (20 trees)' },
    ],
    category: 'environment',
  },
];

export const getCauseById = (id: string) => CURATED_CAUSES.find((cause) => cause.id === id);
