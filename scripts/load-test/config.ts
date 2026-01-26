export type LoadTestConfig = {
  baseUrl: string;
  apiKey?: string;
  durationSeconds: number;
  concurrency: number;
  timeoutMs: number;
  dreamBoardId: string | null;
  contributionId: string | null;
  payoutId: string | null;
};

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const baseUrl = (process.env.LOAD_TEST_BASE_URL ?? 'http://localhost:3000/api/v1').replace(
  /\/$/,
  ''
);

export const loadTestConfig: LoadTestConfig = {
  baseUrl,
  apiKey: process.env.LOAD_TEST_API_KEY,
  durationSeconds: parseNumber(process.env.LOAD_TEST_DURATION_SECONDS, 30),
  concurrency: parseNumber(process.env.LOAD_TEST_CONCURRENCY, 10),
  timeoutMs: parseNumber(process.env.LOAD_TEST_TIMEOUT_MS, 10000),
  dreamBoardId: process.env.LOAD_TEST_DREAM_BOARD_ID ?? null,
  contributionId: process.env.LOAD_TEST_CONTRIBUTION_ID ?? null,
  payoutId: process.env.LOAD_TEST_PAYOUT_ID ?? null,
};
