# NFR & Operations

> Version: 1.0.0
> Last Updated: January 21, 2026
> Status: Authoritative

## Purpose

Define non-functional requirements (NFRs) and operations practices for ChipIn.
Applies to all phases. Use as acceptance criteria for enterprise-grade delivery.

## Availability and Reliability

- Service availability: 99.9% monthly for core flows (Dream Board view, contribution, payment redirects, webhooks).
- Error budget: 43.2 minutes/month.
- Webhook processing: 99.9% of valid events processed within 2 minutes.
- Payment status reconciliation: eventual consistency within 5 minutes (webhook + poll fallback).

## Performance

- API latency: p95 < 500 ms for core endpoints; p99 < 1200 ms.
- Page performance (mobile 4G, mid-tier device):
  - LCP < 2.5 s for guest view and contribution pages.
  - TTFB < 300 ms for cached pages.
- Webhook handlers: p95 < 300 ms (excluding third-party validation).
- Background jobs: idempotent; retry-safe; no global locks.

## Performance Measurement Log

| Date | Environment | Page | Tool | LCP | TTFB | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-01-22 | Staging (URL TBD) | Guest view + Contribute | Lighthouse | Pending | Pending | Blocked: staging URL required. |

## Scalability

- Support 10k concurrent guest sessions and 1k concurrent payments without degradation.
- Horizontal scaling: stateless app servers; DB connection pooling.
- Rate limiting: per-IP and per-API key for public API.

## Security

- Principle of least privilege for DB and service accounts.
- Secrets stored in Vercel env vars; never in repo.
- Webhook verification required for all providers.
- All external callbacks validated and idempotent.
- TLS required for all inbound/outbound traffic.

## Privacy and Compliance (POPIA)

- Data minimization: collect only required fields.
- PII encryption at rest via database and provider controls.
- Access controls for admin and support staff.
- Audit logs for admin actions affecting funds or PII.

## Data Retention

- Contributions and payout records: retain 7 years.
- Audit logs: retain 7 years.
- Webhook payloads: retain 90 days (redacted where possible).
- Session data: max 30 days or session expiry.

## Backup and DR

- Database backups: point-in-time; automated daily snapshots.
- RPO: 15 minutes.
- RTO: 4 hours.
- Quarterly restore drill in staging.

## Observability

- Logging: Vercel logs + structured app logs (JSON).
- Error monitoring: Sentry.
- Tracing: OpenTelemetry (traces for core endpoints and webhooks).
- Uptime checks: synthetic monitoring for guest view + payment initiation + webhook endpoints.
- Dashboards: latency, error rate, webhook backlog, payment reconciliation lag.

## Release Management

- CI gates: lint, typecheck, unit tests, integration tests, E2E.
- Vercel preview deployments for PR verification.
- No direct production deploy without green CI.
- Feature flags for provider toggles and risky flows.

## Support and Incident Response

- On-call rotation: simple weekly rotation.
- Severity levels: Sev1 (payments down), Sev2 (partial payment issues), Sev3 (non-critical UI).
- Incident checklist: detect, triage, mitigate, communicate, postmortem.
- Postmortems within 5 business days for Sev1/Sev2.

## Compliance Boundaries

- ChipIn never handles card data; hosted payment pages only.
- KYC/AML only if required by payment providers.
- Payment provider audits and evidence retained.

## Operational Runbooks (Required)

- Payment provider outage response (PayFast/Ozow/SnapScan).
- Webhook delivery failure response.
- Payout delay response.
- Data incident response.
- Scaling response during high-traffic events.

