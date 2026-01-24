export type PayoutCalculation = {
  raisedCents: number;
  giftCents: number;
  overflowCents: number;
  platformFeeCents: number;
  payoutFeeCents: number;
};

export const calculatePayoutTotals = (params: {
  raisedCents: number;
  goalCents: number;
  platformFeeCents: number;
  payoutFeeCents?: number;
}): PayoutCalculation => {
  const payoutFeeCents = params.payoutFeeCents ?? 0;
  const raisedCents = Math.max(0, params.raisedCents);
  const giftCents = Math.min(raisedCents, params.goalCents);
  const overflowCents = Math.max(0, raisedCents - params.goalCents);

  return {
    raisedCents,
    giftCents,
    overflowCents,
    platformFeeCents: Math.max(0, params.platformFeeCents),
    payoutFeeCents,
  };
};
