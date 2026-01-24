import { describe, expect, it } from 'vitest';

import { buildDashboardViewModel } from '@/lib/host/dashboard-view-model';

describe('buildDashboardViewModel', () => {
  it('builds status, percentage, and share data', () => {
    const view = buildDashboardViewModel(
      {
        id: 'board-1',
        slug: 'maya-birthday-123',
        childName: 'Maya',
        childPhotoUrl: 'https://example.com/child.jpg',
        giftType: 'takealot_product',
        giftData: {
          type: 'takealot_product',
          productUrl: 'https://takealot.com/product/123',
          productName: 'Scooter',
          productImage: 'https://example.com/scooter.jpg',
          productPrice: 52000,
        },
        overflowGiftData: {
          causeId: 'food-forward',
          causeName: 'Feed Hungry Children',
          impactDescription: 'Feed a class',
        },
        goalCents: 5000,
        status: 'paid_out',
        raisedCents: 6000,
        contributionCount: 4,
      },
      { baseUrl: 'https://chipin.co.za' }
    );

    expect(view.boardTitle).toBe("Maya's Dream Board");
    expect(view.statusLabel).toBe('Paid out');
    expect(view.percentage).toBe(100);
    expect(view.shareUrl).toBe('https://chipin.co.za/maya-birthday-123');
    expect(view.displayTitle).toBe('Feed Hungry Children');
  });
});
