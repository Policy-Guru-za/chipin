export type OverflowStateInput = {
  raisedCents: number;
  goalCents: number;
  giftType: 'takealot_product' | 'philanthropy';
  overflowGiftData: unknown | null;
};

export const getOverflowState = (board: OverflowStateInput) => {
  const funded = board.raisedCents >= board.goalCents;
  const showCharityOverflow =
    funded && board.giftType === 'takealot_product' && Boolean(board.overflowGiftData);

  return { funded, showCharityOverflow };
};
