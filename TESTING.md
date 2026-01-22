# Testing

## Quick Commands

- Unit tests: `pnpm test`
- Coverage: `pnpm test:coverage`
- Dead code / unused deps: `pnpm knip`
- Coverage gate runs in CI (`.github/workflows/ci.yml`).

## Coverage Thresholds

Vitest enforces global thresholds (currently 60% for lines/functions/branches/statements). These are configured in `vitest.config.ts`.

## Coverage Exclusions (Principled)

The following files are excluded from coverage and must remain purely declarative or integration-only:

- `src/lib/db/schema.ts` — declarative schema definitions.
- `src/lib/db/queries.ts` — integration query builders that require a live DB.

If you add pure helpers to query logic, move them into a separate helper module (e.g., `queries.helpers.ts`) and cover them with unit tests.

## Guidance for New Exclusions

Any new exclusion must include a one-line rationale in this document (or in `vitest.config.ts` with a reference here) explaining why it is declarative/generated or integration-only.

## Integration Tests

Integration tests live under `tests/integration` and exercise route handlers at the request/response boundary. They must remain deterministic (no external network calls).

## Health Endpoints

- `/health/live`: liveness check (always 200, no dependency checks).
- `/health/ready`: readiness check (200 when configured dependencies are healthy; 503 with structured details otherwise).

Readiness adapters must return `{ ok: boolean; detail?: string }` and never throw.
