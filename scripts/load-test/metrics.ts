import type { LoadTestConfig } from './config';
import type { Scenario } from './scenarios';

export type ScenarioMetrics = {
  count: number;
  errors: number;
  samples: number[];
  statusCounts: Record<string, number>;
};

export type MetricsStore = Map<string, ScenarioMetrics>;

export const createMetricsStore = (): MetricsStore => new Map();

const getMetrics = (store: MetricsStore, name: string): ScenarioMetrics => {
  const existing = store.get(name);
  if (existing) return existing;
  const created: ScenarioMetrics = { count: 0, errors: 0, samples: [], statusCounts: {} };
  store.set(name, created);
  return created;
};

export const recordResult = (
  store: MetricsStore,
  name: string,
  duration: number,
  ok: boolean,
  status?: number
) => {
  const entry = getMetrics(store, name);
  entry.count += 1;
  entry.samples.push(duration);
  if (!ok) entry.errors += 1;
  if (status) {
    const key = String(status);
    entry.statusCounts[key] = (entry.statusCounts[key] ?? 0) + 1;
  }
};

const percentile = (samples: number[], value: number) => {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((value / 100) * sorted.length));
  return sorted[index];
};

export const summarize = (store: MetricsStore, scenarios: Scenario[], config: LoadTestConfig) => {
  console.log('\nLoad test summary');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Duration: ${config.durationSeconds}s`);
  console.log(`Concurrency: ${config.concurrency}`);
  console.log('Scenarios:');
  for (const scenario of scenarios) {
    console.log(`- ${scenario.name} (${scenario.method} ${scenario.path})`);
  }
  console.log('');

  let totalErrors = 0;
  for (const [name, entry] of store.entries()) {
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

  return totalErrors;
};
