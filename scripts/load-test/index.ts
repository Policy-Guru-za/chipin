import { loadTestConfig } from './config';
import { createMetricsStore, summarize } from './metrics';
import { runLoadTest } from './runner';
import { buildScenarios } from './scenarios';

const main = async () => {
  if (!loadTestConfig.apiKey) {
    console.error('Missing LOAD_TEST_API_KEY environment variable.');
    process.exit(1);
  }

  const scenarios = buildScenarios(loadTestConfig);
  if (scenarios.length === 0) {
    console.error('No scenarios configured.');
    process.exit(1);
  }

  const store = createMetricsStore();
  await runLoadTest(scenarios, loadTestConfig, store);
  const totalErrors = summarize(store, scenarios, loadTestConfig);

  if (totalErrors > 0) {
    console.error(`\nLoad test completed with ${totalErrors} errors.`);
    process.exitCode = 1;
  } else {
    console.log('\nLoad test completed with no errors.');
  }
};

main().catch((error) => {
  console.error('Load test failed', error);
  process.exit(1);
});
