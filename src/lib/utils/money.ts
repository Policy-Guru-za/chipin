const formatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatterWithCents = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatZar(amountCents: number) {
  return formatter.format(amountCents / 100);
}

export function formatZarWithCents(amountCents: number) {
  return formatterWithCents.format(amountCents / 100);
}
