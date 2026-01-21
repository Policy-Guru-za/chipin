import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10);

export function generatePaymentRef() {
  return `CONTRIB-${nanoid()}`;
}
