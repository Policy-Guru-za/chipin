export type PaginationCursor = {
  createdAt: Date;
  id: string;
};

const CURSOR_SEPARATOR = '|';

export const encodeCursor = (cursor: { createdAt: Date | string; id: string }) => {
  const createdAt =
    cursor.createdAt instanceof Date ? cursor.createdAt.toISOString() : cursor.createdAt;
  return Buffer.from(`${createdAt}${CURSOR_SEPARATOR}${cursor.id}`).toString('base64url');
};

export const decodeCursor = (value?: string | null): PaginationCursor | null => {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const [createdAtRaw, id] = decoded.split(CURSOR_SEPARATOR);
    if (!createdAtRaw || !id) return null;
    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
};
