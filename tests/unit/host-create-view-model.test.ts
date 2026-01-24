import { describe, expect, it } from 'vitest';

import type { DreamBoardDraft } from '@/lib/dream-boards/draft';
import { buildCreateFlowViewModel } from '@/lib/host/create-view-model';

const baseDraft: DreamBoardDraft = {
  childName: 'Maya',
  birthdayDate: '2026-02-01',
  childPhotoUrl: 'https://example.com/child.jpg',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('buildCreateFlowViewModel', () => {
  it('redirects to child step when prerequisites are missing', () => {
    const view = buildCreateFlowViewModel({ step: 'gift', draft: null });

    expect(view.redirectTo).toBe('/create/child');
    expect(view.title).toBe('What’s the dream gift?');
  });

  it('builds takealot gift preview details', () => {
    const view = buildCreateFlowViewModel({
      step: 'gift',
      draft: {
        ...baseDraft,
        giftType: 'takealot_product',
        giftData: {
          type: 'takealot_product',
          productUrl: 'https://takealot.com/product/123',
          productName: 'Scooter',
          productImage: 'https://example.com/scooter.jpg',
          productPrice: 52000,
        },
        goalCents: 52000,
      },
    });

    expect(view.redirectTo).toBeUndefined();
    expect(view.giftPreview?.title).toBe('Scooter');
    expect(view.giftPreview?.priceLabel).toBe('R520.00');
  });

  it('redirects review step when payout details are missing', () => {
    const view = buildCreateFlowViewModel({
      step: 'review',
      draft: {
        ...baseDraft,
        giftType: 'philanthropy',
        giftData: {
          type: 'philanthropy',
          causeId: 'greenpop',
          causeName: 'Plant Trees',
          causeDescription: 'Plant indigenous trees across South Africa.',
          causeImage: '/causes/greenpop.jpg',
          impactDescription: 'Plant 10 trees',
          amountCents: 50000,
        },
        goalCents: 50000,
      },
    });

    expect(view.redirectTo).toBe('/create/details');
  });
});
