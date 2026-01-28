import { isValidUuid } from '@/lib/utils/validation';

const PUBLIC_ID_MAX_LENGTH = 100;
const PUBLIC_ID_REGEX = /^[a-z0-9-]+$/i;

export const isValidPublicId = (value: string) =>
  value.length > 0 && value.length <= PUBLIC_ID_MAX_LENGTH && PUBLIC_ID_REGEX.test(value);

export { isValidUuid };
