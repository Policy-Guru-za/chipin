import { describe, expect, it } from 'vitest';

import { buildGuestViewModel } from '@/lib/dream-boards/view-model';

type DreamBoardRecord = Parameters<typeof buildGuestViewModel>[0];

const makeBoard = (overrides: Partial<DreamBoardRecord> = {}) =>
  ({
    id: 'board-1',
    slug: 'maya-birthday-123',
    hostId: 'host-1',
    childName: 'Maya',
    childPhotoUrl: 'https://example.com/child.jpg',
    birthdayDate: new Date('2026-02-01'),
    giftType: 'takealot_product',
    giftData: {
      productName: 'Scooter',
      productImage: 'https://example.com/scooter.jpg',
    },
    goalCents: 5000,
    payoutMethod: 'takealot_gift_card',
    overflowGiftData: {
      causeId: 'food-forward',
      causeName: 'Feed Hungry Children',
      impactDescription: 'Feed a class',
    },
    message: 'Let’s do it',
    deadline: new Date('2026-02-05'),
    status: 'active',
    payoutEmail: 'maya@example.com',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    raisedCents: 1000,
    contributionCount: 2,
    ...overrides,
  }) as DreamBoardRecord;

describe('buildGuestViewModel', () => {
  it('builds a takealot gift view with subtitle override', () => {
    const view = buildGuestViewModel(makeBoard(), { takealotSubtitle: 'Her dream gift' });

    expect(view.giftTitle).toBe('Scooter');
    expect(view.giftSubtitle).toBe('Her dream gift');
    expect(view.displayTitle).toBe('Scooter');
    expect(view.displaySubtitle).toBe('Her dream gift');
    expect(view.displayImage).toBe('https://example.com/scooter.jpg');
    expect(view.showCharityOverflow).toBe(false);
  });

  it('uses the injected clock for days left', () => {
    const view = buildGuestViewModel(
      makeBoard({ deadline: new Date('2026-02-05T00:00:00.000Z') }),
      { now: new Date('2026-02-03T00:00:00.000Z') }
    );

    expect(view.daysLeft).toBe(2);
  });

  it('switches to overflow display when funded', () => {
    const view = buildGuestViewModel(makeBoard({ raisedCents: 6000 }));

    expect(view.showCharityOverflow).toBe(true);
    expect(view.displayTitle).toBe('Feed Hungry Children');
    expect(view.displaySubtitle).toBe('Feed a class');
    expect(view.displayImage).toBe('/causes/food-forward.jpg');
  });

  it('builds philanthropy gift display data', () => {
    const view = buildGuestViewModel(
      makeBoard({
        giftType: 'philanthropy',
        payoutMethod: 'philanthropy_donation',
        giftData: {
          causeName: 'Plant Trees',
          causeImage: 'https://example.com/trees.jpg',
          impactDescription: 'Plant 10 trees',
        },
        overflowGiftData: null,
      })
    );

    expect(view.giftTitle).toBe('Plant Trees');
    expect(view.giftSubtitle).toBe('Plant 10 trees');
    expect(view.displayTitle).toBe('Plant Trees');
    expect(view.showCharityOverflow).toBe(false);
  });
});
