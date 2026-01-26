import { performance } from 'node:perf_hooks';

import type { LoadTestConfig } from './config';
import type { MetricsStore } from './metrics';
import { recordResult } from './metrics';
import type { Scenario } from './scenarios';

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const runScenario = async (scenario: Scenario, config: LoadTestConfig, store: MetricsStore) => {
  const url = `${config.baseUrl}${scenario.path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: 'application/json',
  };
  let body: string | undefined;
  if (scenario.body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(scenario.body);
  }

  const start = performance.now();
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: scenario.method,
        headers,
        body,
      },
      config.timeoutMs
    );
    const duration = performance.now() - start;
    recordResult(store, scenario.name, duration, response.ok, response.status);
    await response.arrayBuffer().catch(() => undefined);
  } catch {
    const duration = performance.now() - start;
    recordResult(store, scenario.name, duration, false);
  }
};

const runWorker = async (
  index: number,
  endTime: number,
  scenarios: Scenario[],
  config: LoadTestConfig,
  store: MetricsStore
) => {
  let iter = 0;
  while (performance.now() < endTime) {
    const scenario = scenarios[(index + iter) % scenarios.length];
    await runScenario(scenario, config, store);
    iter += 1;
  }
};

export const runLoadTest = async (
  scenarios: Scenario[],
  config: LoadTestConfig,
  store: MetricsStore
) => {
  const endTime = performance.now() + config.durationSeconds * 1000;
  await Promise.all(
    Array.from({ length: config.concurrency }, (_, index) =>
      runWorker(index, endTime, scenarios, config, store)
    )
  );
};
