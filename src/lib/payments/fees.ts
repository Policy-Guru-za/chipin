const FEE_PERCENTAGE = 0.03;
const MIN_FEE_CENTS = 300;
const MAX_FEE_CENTS = 50000;

export function calculateFee(amountCents: number) {
  const fee = Math.round(amountCents * FEE_PERCENTAGE);
  return Math.max(MIN_FEE_CENTS, Math.min(MAX_FEE_CENTS, fee));
}

export function calculateTotalWithFee(amountCents: number) {
  return amountCents + calculateFee(amountCents);
}
