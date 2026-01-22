import { describe, expect, it } from 'vitest';

import { buildDreamBoardMetadata } from '@/lib/dream-boards/metadata';

describe('buildDreamBoardMetadata', () => {
  it('uses overflow metadata once the gift is funded', () => {
    const metadata = buildDreamBoardMetadata(
      {
        slug: 'maya-birthday-123',
        childName: 'Maya',
        childPhotoUrl: '/kids/maya.jpg',
        giftType: 'takealot_product',
        giftData: {
          productName: 'Wooden Scooter',
          productImage: '/products/scooter.jpg',
        },
        overflowGiftData: {
          causeId: 'food-forward',
          causeName: 'Feed Hungry Children',
          impactDescription: 'Provide warm meals for kids in need.',
        },
        goalCents: 5000,
        raisedCents: 7500,
      },
      { baseUrl: 'http://localhost:3000', path: '/maya-birthday-123/contribute' }
    );

    expect(metadata.description).toContain('Feed Hungry Children');
    expect(metadata.openGraph?.url).toBe('http://localhost:3000/maya-birthday-123/contribute');
    expect(metadata.openGraph?.images?.[0]?.url).toBe(
      'http://localhost:3000/causes/food-forward.jpg'
    );
    expect(metadata.openGraph?.images?.[0]?.alt).toBe('Provide warm meals for kids in need.');
  });
});
