import { performance } from 'node:perf_hooks';

type Scenario = {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
};

type ScenarioMetrics = {
  count: number;
  errors: number;
  samples: number[];
  statusCounts: Record<string, number>;
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
const apiKey = process.env.LOAD_TEST_API_KEY;
const durationSeconds = parseNumber(process.env.LOAD_TEST_DURATION_SECONDS, 30);
const concurrency = parseNumber(process.env.LOAD_TEST_CONCURRENCY, 10);
const timeoutMs = parseNumber(process.env.LOAD_TEST_TIMEOUT_MS, 10000);

if (!apiKey) {
  console.error('Missing LOAD_TEST_API_KEY environment variable.');
  process.exit(1);
}

const dreamBoardId = process.env.LOAD_TEST_DREAM_BOARD_ID ?? null;
const contributionId = process.env.LOAD_TEST_CONTRIBUTION_ID ?? null;
const payoutId = process.env.LOAD_TEST_PAYOUT_ID ?? null;

const scenarios: Scenario[] = [
  { name: 'dream-boards.list', method: 'GET', path: '/dream-boards?limit=5' },
  { name: 'payouts.pending', method: 'GET', path: '/payouts/pending?limit=5' },
  { name: 'webhooks.list', method: 'GET', path: '/webhooks' },
];

if (dreamBoardId) {
  scenarios.push(
    { name: 'dream-boards.get', method: 'GET', path: `/dream-boards/${dreamBoardId}` },
    {
      name: 'dream-boards.contributions',
      method: 'GET',
      path: `/dream-boards/${dreamBoardId}/contributions?limit=5`,
    }
  );
}

if (contributionId) {
  scenarios.push({
    name: 'contributions.get',
    method: 'GET',
    path: `/contributions/${contributionId}`,
  });
}

if (payoutId) {
  scenarios.push({ name: 'payouts.get', method: 'GET', path: `/payouts/${payoutId}` });
}

const metrics = new Map<string, ScenarioMetrics>();

const getMetrics = (name: string): ScenarioMetrics => {
  const existing = metrics.get(name);
  if (existing) return existing;
  const created: ScenarioMetrics = { count: 0, errors: 0, samples: [], statusCounts: {} };
  metrics.set(name, created);
  return created;
};

const recordResult = (name: string, duration: number, ok: boolean, status?: number) => {
  const entry = getMetrics(name);
  entry.count += 1;
  entry.samples.push(duration);
  if (!ok) entry.errors += 1;
  if (status) {
    const key = String(status);
    entry.statusCounts[key] = (entry.statusCounts[key] ?? 0) + 1;
  }
};

const fetchWithTimeout = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const runScenario = async (scenario: Scenario) => {
  const url = `${baseUrl}${scenario.path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };
  let body: string | undefined;
  if (scenario.body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(scenario.body);
  }

  const start = performance.now();
  try {
    const response = await fetchWithTimeout(url, {
      method: scenario.method,
      headers,
      body,
    });
    const duration = performance.now() - start;
    recordResult(scenario.name, duration, response.ok, response.status);
    await response.arrayBuffer().catch(() => undefined);
  } catch {
    const duration = performance.now() - start;
    recordResult(scenario.name, duration, false);
  }
};

const runWorker = async (index: number, endTime: number) => {
  let iter = 0;
  while (performance.now() < endTime) {
    const scenario = scenarios[(index + iter) % scenarios.length];
    await runScenario(scenario);
    iter += 1;
  }
};

const percentile = (samples: number[], value: number) => {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((value / 100) * sorted.length));
  return sorted[index];
};

const summarize = () => {
  console.log('\nLoad test summary');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Duration: ${durationSeconds}s`);
  console.log(`Concurrency: ${concurrency}`);
  console.log('Scenarios:');
  for (const scenario of scenarios) {
    console.log(`- ${scenario.name} (${scenario.method} ${scenario.path})`);
  }
  console.log('');

  let totalErrors = 0;
  for (const [name, entry] of metrics.entries()) {
    const avg = entry.samples.length
      ? entry.samples.reduce((sum, value) => sum + value, 0) / entry.samples.length
      : 0;
    const p95 = percentile(entry.samples, 95);
    const p99 = percentile(entry.samples, 99);
    totalErrors += entry.errors;

    console.log(`Scenario: ${name}`);
    console.log(`  Requests: ${entry.count}`);
    console.log(`  Errors: ${entry.errors}`);
    console.log(`  Avg: ${avg.toFixed(1)}ms  P95: ${p95.toFixed(1)}ms  P99: ${p99.toFixed(1)}ms`);
    console.log(`  Statuses: ${JSON.stringify(entry.statusCounts)}`);
  }

  if (totalErrors > 0) {
    console.error(`\nLoad test completed with ${totalErrors} errors.`);
    process.exitCode = 1;
  } else {
    console.log('\nLoad test completed with no errors.');
  }
};

const main = async () => {
  if (scenarios.length === 0) {
    console.error('No scenarios configured.');
    process.exit(1);
  }

  const endTime = performance.now() + durationSeconds * 1000;
  await Promise.all(Array.from({ length: concurrency }, (_, index) => runWorker(index, endTime)));
  summarize();
};

main().catch((error) => {
  console.error('Load test failed', error);
  process.exit(1);
});
