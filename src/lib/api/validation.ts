const PUBLIC_ID_MAX_LENGTH = 100;
const PUBLIC_ID_REGEX = /^[a-z0-9-]+$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidPublicId = (value: string) =>
  value.length > 0 && value.length <= PUBLIC_ID_MAX_LENGTH && PUBLIC_ID_REGEX.test(value);

export const isValidUuid = (value: string) => UUID_REGEX.test(value);
