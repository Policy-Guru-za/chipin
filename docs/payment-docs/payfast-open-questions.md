# PayFast Open Questions / Known Gaps

These are integration-relevant uncertainties where the PayFast docs do not fully specify operational behaviour.

## Credentials and environments
- https://developers.payfast.co.za/api#recurring-billing: Does `?testing=true` apply to *all* API endpoints (refunds, transaction history), or only the endpoints explicitly documented?
- https://developers.payfast.co.za/docs#go_live: Docs note a minimum of ZAR 5.00 for live processing. Is there also a minimum for sandbox, and is the minimum enforced for `recurring_amount` and refunds?

## Signatures
- https://developers.payfast.co.za/docs#step_2_signature: When passphrase is not configured, should integrators omit `passphrase` entirely, or include `passphrase=` empty? (Docs describe adding the passphrase but do not specify behaviour for empty passphrase.)
- https://developers.payfast.co.za/docs#step_2_signature: Beyond upper-case URL encoding + spaces as `+`, are there any additional canonicalisation requirements (Unicode normalisation, treatment of `~`, etc.)?

## Redirect flow
- https://developers.payfast.co.za/docs#step_1_form_fields: Do PayFast hosted payment pages support currencies other than ZAR? (Docs describe amounts in ZAR; multi-currency behaviour not specified.)
- https://developers.payfast.co.za/docs#step_1_form_fields: Are there restrictions on `return_url`/`cancel_url`/`notify_url` beyond “string” (HTTPS-only, maximum length, required to be publicly routable, etc.)?

## ITN verification
- https://developers.payfast.co.za/docs#step_4_confirm_payment: Docs say retries stop “eventually” after exponential backoff. What is the maximum retry window / final attempt schedule?
- https://developers.payfast.co.za/docs#step_4_confirm_payment: Docs’ sample validates source using `HTTP_REFERER`. Is the Referer header guaranteed to be present for ITN requests? If not, what is the recommended validation approach?
- https://developers.payfast.co.za/docs#ports-ips: Are the listed IP ranges authoritative for ITN delivery (both sandbox and live), and do they change with notice?

## Subscriptions / recurring
- https://developers.payfast.co.za/docs#subscriptions: For `amount=R0.00` initial subscription/tokenisation setups, are there constraints (payment method restrictions, mandatory 3-D Secure, maximum trial length)?
- https://developers.payfast.co.za/api#recurring-billing: The API shows `status` values (e.g. `1`, `ACTIVE`) but does not enumerate all statuses and transitions. What is the complete status model?

## Refunds / operations
- https://developers.payfast.co.za/api#refund-create: Docs do not specify refund processing times, settlement delays, or refund availability windows per payment type.
- https://developers.payfast.co.za/api#refund-create: For `BANK_PAYOUT` fields, docs show alternate names (`acc_holder | bank_account_holder`, `acc_type | bank_account_type`). Which keys are accepted/preferred in JSON vs form-encoded payloads?
