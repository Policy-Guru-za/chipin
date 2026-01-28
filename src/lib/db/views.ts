import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';

export type DreamBoardWithTotals = {
  id: string;
  slug: string;
  childName: string;
  childPhotoUrl: string;
  birthdayDate: Date;
  giftType: 'takealot_product' | 'philanthropy';
  giftData: unknown;
  payoutMethod: 'takealot_gift_card' | 'karri_card_topup' | 'philanthropy_donation';
  overflowGiftData: unknown | null;
  goalCents: number;
  payoutEmail: string;
  message: string | null;
  deadline: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  raisedCents: number;
  contributionCount: number;
};

export type ExpiringDreamBoard = {
  id: string;
  slug: string;
  childName: string;
  deadline: Date;
  status: string;
};

export const getDreamBoardWithTotals = async (id: string): Promise<DreamBoardWithTotals | null> => {
  const result = await db.execute<DreamBoardWithTotals>(sql`
    SELECT
      id,
      slug,
      child_name as "childName",
      child_photo_url as "childPhotoUrl",
      birthday_date as "birthdayDate",
      gift_type as "giftType",
      gift_data as "giftData",
      payout_method as "payoutMethod",
      overflow_gift_data as "overflowGiftData",
      goal_cents as "goalCents",
      payout_email as "payoutEmail",
      message,
      deadline,
      status,
      created_at as "createdAt",
      updated_at as "updatedAt",
      raised_cents as "raisedCents",
      contribution_count as "contributionCount"
    FROM dream_boards_with_totals
    WHERE id = ${id}
    LIMIT 1
  `);

  return result.rows[0] ?? null;
};

export const getExpiringDreamBoards = async (limit = 6): Promise<ExpiringDreamBoard[]> => {
  const result = await db.execute<ExpiringDreamBoard>(sql`
    SELECT
      id,
      slug,
      child_name as "childName",
      deadline,
      status
    FROM expiring_dream_boards
    ORDER BY deadline ASC
    LIMIT ${limit}
  `);

  return result.rows;
};
