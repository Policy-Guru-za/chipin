import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const parseHeaders = (raw?: string): Record<string, string> | undefined => {
  if (!raw) return undefined;
  return Object.fromEntries(
    raw
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [key, ...rest] = pair.split('=');
        return [key.trim(), rest.join('=').trim()];
      })
  );
};

export const getServiceName = (): string =>
  process.env.OTEL_SERVICE_NAME ?? 'chipin';

export const buildOtelExporter = (): OTLPTraceExporter | null => {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return null;

  return new OTLPTraceExporter({
    url: endpoint,
    headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
  });
};
