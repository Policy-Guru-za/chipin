import { createHash } from 'crypto';

import { db } from './index';
import {
  apiKeys,
  auditLogs,
  contributions,
  dreamBoards,
  hosts,
  payoutItems,
  payouts,
  webhookEvents,
} from './schema';

export async function seedDatabase() {
  await db.delete(webhookEvents);
  await db.delete(auditLogs);
  await db.delete(payoutItems);
  await db.delete(apiKeys);
  await db.delete(payouts);
  await db.delete(contributions);
  await db.delete(dreamBoards);
  await db.delete(hosts);

  const [host] = await db
    .insert(hosts)
    .values({
      email: 'lerato@chipin.co.za',
      name: 'Lerato Mahlangu',
    })
    .returning({ id: hosts.id });

  const futureBirthday = new Date();
  futureBirthday.setMonth(futureBirthday.getMonth() + 3);
  const birthdayDate = futureBirthday.toISOString().split('T')[0];

  const [dreamBoard] = await db
    .insert(dreamBoards)
    .values({
      hostId: host.id,
      slug: 'maya-birthday-demo',
      childName: 'Maya',
      childPhotoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
      birthdayDate,
      giftType: 'takealot_product',
      giftData: {
        type: 'takealot_product',
        productUrl: 'https://www.takealot.com/demo',
        productName: 'Wooden Train Set',
        productImage: 'https://images.unsplash.com/photo-1509223197845-458d87318791',
        productPrice: 35000,
      },
      goalCents: 35000,
      payoutMethod: 'takealot_gift_card',
      overflowGiftData: {
        causeId: 'charity-hope-01',
        causeName: 'Hope SA',
        impactDescription: 'Provide school meals for 10 kids',
      },
      message: 'Let’s make Maya’s birthday magical.',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      status: 'active',
      payoutEmail: 'lerato@chipin.co.za',
    })
    .returning({ id: dreamBoards.id });

  await db.insert(contributions).values({
    dreamBoardId: dreamBoard.id,
    contributorName: 'Ava',
    message: 'Happy birthday, Maya!',
    amountCents: 5000,
    feeCents: 300,
    paymentProvider: 'payfast',
    paymentRef: 'PF-TEST-001',
    paymentStatus: 'completed',
  });

  const [payout] = await db
    .insert(payouts)
    .values({
      dreamBoardId: dreamBoard.id,
      type: 'takealot_gift_card',
      grossCents: 5000,
      feeCents: 300,
      netCents: 4700,
      recipientData: {
        email: 'lerato@chipin.co.za',
        productUrl: 'https://www.takealot.com/demo',
      },
      status: 'pending',
    })
    .returning({ id: payouts.id });

  await db.insert(payoutItems).values({
    payoutId: payout.id,
    dreamBoardId: dreamBoard.id,
    type: 'gift',
    amountCents: 4700,
    metadata: { seeded: true },
  });

  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      partnerName: 'Demo Partner',
      keyHash: createHash('sha256')
        .update('cpk_test_0123456789abcdef0123456789abcdef')
        .digest('hex'),
      keyPrefix: 'cpk_test_',
      scopes: ['dreamboards:read'],
      rateLimit: 1000,
      isActive: true,
    })
    .returning({ id: apiKeys.id });

  await db.insert(webhookEvents).values({
    apiKeyId: apiKey.id,
    eventType: 'dream_board.created',
    payload: {
      dreamBoardId: dreamBoard.id,
      hostId: host.id,
    },
    status: 'pending',
    attempts: 0,
  });
}
