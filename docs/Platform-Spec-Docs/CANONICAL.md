# ChipIn Canonical Spec (Source of Truth)

> **Version:** 1.1.0  
> **Last Updated:** January 21, 2026  
> **Status:** Authoritative

---

## Purpose

Resolve conflicts across docs. When anything disagrees, this file wins.

---

## Core Decisions

### Product Scope

- **Dream Board:** one primary gift goal (Takealot product) or a primary philanthropy goal.
- **Guest flow:** mobile-web; single CTA; no sign-in.
- **Host flow:** magic link; 4-step wizard + review/share.

### Gift, Payout, and Charity Overflow

- **Gift type** is independent from **payout method**.
- If **gift_type = takealot_product**, host must select a **charity overflow cause** during setup.
- When **raised_cents >= goal_cents**:
  - Guest view switches to **charity-only** view.
  - **Original gift is hidden** on guest view.
  - Contributions remain open until deadline or manual close.
- **Overflow is open-ended** (no target).
- **Gift payout** uses chosen payout method:
  - `takealot_gift_card` **or** `karri_card_topup` (for Takealot gifts).
  - `philanthropy_donation` (for philanthropy gifts).
- **Charity overflow payout** uses `philanthropy_donation`.
- Payouts are **1:N** per Dream Board (gift payout + optional overflow payout).

### Public vs Private Display

- **Public guest view:** percentage only (no exact amounts) while funding the gift.
- **Host view:** exact amounts, contributor details, payout totals.
- Once funded, guest view shows **charity name + amount raised** (open-ended).

### Payments

- **Primary provider:** PayFast.
- **Optional providers:** Ozow, SnapScan (feature-flagged; not blocking MVP).
- **Stitch:** under evaluation as all-in-one option.

### Auth and Session Storage

- Magic link tokens and sessions stored in **Vercel KV** (not database tables).

### Package Manager

- **pnpm only**.

---

## Data Model Canonical Fields

### dream_boards (selected)

- `gift_type` = `takealot_product | philanthropy`
- `gift_data` (Takealot product or philanthropy data)
- `goal_cents` (gift target)
- `payout_method` = `takealot_gift_card | karri_card_topup | philanthropy_donation`
- `overflow_gift_data` (philanthropy data; required when gift_type = takealot_product)
- `status` = `draft | active | funded | closed | paid_out | expired | cancelled`

### payouts

- Multiple payouts per Dream Board.
- `type` = `takealot_gift_card | karri_card_topup | philanthropy_donation`

---

## Canonical Behavior

- **Funding phase:** gift until goal reached, then charity overflow.
- **Raised calculations:** `raised_cents` is net contributions; `overflow_cents = max(0, raised_cents - goal_cents)`.
- **Close conditions:** manual close or deadline; closing triggers payout(s).

---

## Documents Updated to Match

All docs in `docs/Platform-Spec-Docs/`, plus `README.md` and `AGENTS.md`.
