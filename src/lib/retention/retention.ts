export const RETENTION_WINDOWS_DAYS = {
  ipAddress: 30,
  boardGrace: 90,
} as const;

export const RETENTION_ELIGIBLE_STATUSES = ['closed', 'paid_out', 'expired', 'cancelled'] as const;
export const NETWORK_METADATA_NULLS = { ipAddress: null, userAgent: null } as const;

export const ANONYMIZED_CHILD_NAME = 'Child';
export const ANONYMIZED_CHILD_PHOTO_URL = '/images/child-placeholder.svg';

const DAY_MS = 24 * 60 * 60 * 1000;

export const getRetentionCutoffs = (now: Date = new Date()) => ({
  ipCutoff: new Date(now.getTime() - RETENTION_WINDOWS_DAYS.ipAddress * DAY_MS),
  boardCutoff: new Date(now.getTime() - RETENTION_WINDOWS_DAYS.boardGrace * DAY_MS),
});
