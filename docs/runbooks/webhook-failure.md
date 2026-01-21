# Runbook: Webhook Failure

## Purpose
Respond to webhook delivery failures from payment providers or partner integrations.

## Detection Signals
- Sentry alerts on webhook routes.
- Increase in `webhook_events` with `status=pending` or high retry counts.
- Provider dashboard indicates delivery failures or signature mismatches.

## Immediate Triage
1. Confirm which webhook endpoint is failing.
2. Check signature verification errors vs. payload parsing errors.
3. Validate provider credentials in environment variables.
4. Inspect recent deploys for regressions in parsing or signature logic.

## Mitigation Steps
**If signature verification fails:**
1. Validate provider secrets against dashboards.
2. Confirm encoding/order requirements (PayFast order-of-appearance, SnapScan HMAC, Ozow Svix).
3. Temporarily allow manual reconciliation if allowed by policy.

**If endpoint is unavailable:**
1. Restore endpoint availability (deploy rollback if needed).
2. Enable provider retry or replay mechanism.
3. Increase logging for raw payload visibility.

## Communication Template
**Internal:**
> Webhook failure detected for **[PROVIDER]** on **[ENDPOINT]**. Error: **[SIGNATURE/PARSE/5XX]**. Mitigation in progress. Next update in **[X]** minutes.

## Recovery
1. Re-enable signature verification if it was temporarily relaxed.
2. Replay failed webhooks and reconcile payment statuses.
3. Confirm no stuck payments remain.

## Post‑Incident
- RCA with root cause and missed alerts.
- Add guardrails or automated reconciliation improvements.
