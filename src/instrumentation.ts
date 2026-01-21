import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

import { buildOtelExporter, getServiceName } from './lib/observability/otel';

let sdk: NodeSDK | null = null;

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const exporter = buildOtelExporter();
  if (!exporter) return;

  sdk = new NodeSDK({
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: getServiceName(),
    }),
  });

  await sdk.start();

  process.on('SIGTERM', async () => {
    await sdk?.shutdown();
  });
}
