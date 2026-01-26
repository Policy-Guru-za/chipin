type ContributionApiRecord = {
  id: string;
  dreamBoardId: string;
  contributorName: string | null;
  message: string | null;
  amountCents: number;
  feeCents: number;
  netCents: number | null;
  paymentStatus: string;
  createdAt: Date | string;
};

const toIsoString = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

export const serializeContribution = (record: ContributionApiRecord) => ({
  id: record.id,
  dream_board_id: record.dreamBoardId,
  contributor_name: record.contributorName,
  message: record.message,
  amount_cents: record.amountCents,
  fee_cents: record.feeCents,
  net_cents: record.netCents ?? record.amountCents - record.feeCents,
  payment_status: record.paymentStatus,
  created_at: toIsoString(record.createdAt),
});
