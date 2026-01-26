import { describe, expect, it } from 'vitest';

import {
  buildContributionViewModel,
  buildGuestViewModel,
  buildThankYouViewModel,
} from '@/lib/dream-boards/view-model';

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

describe('buildContributionViewModel', () => {
  it('builds a standard contribution headline', () => {
    const view = buildContributionViewModel(makeBoard());

    expect(view.headline).toBe("Contribute to Maya's gift");
    expect(view.cardTag).toBeUndefined();
    expect(view.overflowNoticeBody).toBeUndefined();
  });

  it('builds overflow contribution copy when funded', () => {
    const view = buildContributionViewModel(makeBoard({ raisedCents: 7000 }));

    expect(view.headline).toBe('Support Feed Hungry Children');
    expect(view.cardTag).toBe('Charity overflow');
    expect(view.overflowNoticeTitle).toBe('Gift fully funded!');
    expect(view.overflowNoticeBody).toBe(
      'Contributions now support Feed Hungry Children: Feed a class.'
    );
  });
});

describe('buildThankYouViewModel', () => {
  it('builds a completed thank-you message', () => {
    const view = buildThankYouViewModel({
      board: makeBoard(),
      contribution: {
        id: 'contrib-1',
        dreamBoardId: 'board-1',
        contributorName: 'Ava',
        amountCents: 2500,
        feeCents: 0,
        netCents: 2500,
        paymentStatus: 'completed',
      },
    });

    expect(view.headline).toBe('Thank you, Ava!');
    expect(view.message).toMatch(/Your R\s*25 contribution is helping Maya get their dream gift\./);
    expect(view.percentage).toBe(20);
  });

  it('builds a pending thank-you message', () => {
    const view = buildThankYouViewModel({
      board: makeBoard(),
      contribution: {
        id: 'contrib-2',
        dreamBoardId: 'board-1',
        contributorName: null,
        amountCents: 2500,
        feeCents: 0,
        netCents: 2500,
        paymentStatus: 'pending',
      },
    });

    expect(view.headline).toBe('Thanks for your support!');
    expect(view.message).toBe('We’ll update this page once your payment is confirmed.');
  });

  it('builds a philanthropy thank-you message', () => {
    const view = buildThankYouViewModel({
      board: makeBoard({
        giftType: 'philanthropy',
        payoutMethod: 'philanthropy_donation',
        giftData: {
          causeName: 'Plant Trees',
          causeImage: 'https://example.com/trees.jpg',
          impactDescription: 'Plant 10 trees',
        },
        overflowGiftData: null,
      }),
      contribution: {
        id: 'contrib-3',
        dreamBoardId: 'board-1',
        contributorName: 'Ava',
        amountCents: 2500,
        feeCents: 0,
        netCents: 2500,
        paymentStatus: 'completed',
      },
    });

    expect(view.message).toMatch(/supporting Plant Trees: Plant 10 trees\./);
  });

  it('builds an overflow thank-you message', () => {
    const view = buildThankYouViewModel({
      board: makeBoard({ raisedCents: 7000 }),
      contribution: {
        id: 'contrib-4',
        dreamBoardId: 'board-1',
        contributorName: 'Ava',
        amountCents: 2500,
        feeCents: 0,
        netCents: 2500,
        paymentStatus: 'completed',
      },
    });

    expect(view.message).toMatch(/supporting Feed Hungry Children: Feed a class\./);
  });
});
