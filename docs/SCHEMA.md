# FairSplit — Canonical Schema Reference

This is the single source of truth for exact field names, types, and units.
When in doubt about a field name — especially money fields — check here,
or check the actual model file, before assuming. Update this file the
moment a schema changes; a stale copy here is worse than no copy.

## Bill (models/Bill.js)

| Field | Type | Notes |
|---|---|---|
| `hostName` | String, required | |
| `receiptImageUrl` | String | V1: local disk path |
| `restaurantName` | String | Best-effort from OCR, host-editable |
| `taxPercent` | Number, 0–100, default 0 | Percent of item subtotal |
| `tipPercent` | Number, 0–100, default 0 | Percent of item subtotal |
| `currency` | String enum: `INR`/`GBP`/`USD`, default `INR` | No conversion, ever |
| `hostUpiId` | String, optional | `name@bank` shape, validated at creation |
| `status` | String enum: `draft`/`open`/`closed`, default `draft` | |
| `shareCode` | String, required, **unique** | Public, given to participants |
| `hostCode` | String, required, **not unique** (uniqueness unnecessary — always checked together with a specific billId) | Secret, host-only actions |
| `finalBreakdown` | Array, default `null` | Set once at close, never recomputed after |
| `createdAt` | Date, default now | |

**Removed / do not reintroduce:** `taxAmount`, `tipAmount` (decimal flat
amounts) — replaced by percent-based fields, removed as dead code.

## Item (models/Item.js)

| Field | Type | Notes |
|---|---|---|
| `billId` | ObjectId ref Bill, required | |
| `name` | String, required | OCR-extracted, host-editable pre-publish |
| `priceCents` | Number, required, integer, min 0 | **TOTAL line price in integer cents** — e.g. $19.99 → `1999`. Never a decimal. Converted from OCR's decimal output exactly once, at ingestion, via `Math.round(price * 100)`. |
| `quantity` | Number, default 1 | Informational only — does NOT cap claims |
| `claims` | Array of subdocuments | See below |

### claims[] subdocument

| Field | Type | Notes |
|---|---|---|
| `participantId` | ObjectId ref Participant | |
| `claimedAt` | Date, default now | |
| `customAmountCents` | Number, default `null` | `null` = even split; integer cents if set |

**Removed / do not reintroduce:** `price` (decimal) — renamed to
`priceCents` (integer) after a float-precision bug was found in the atomic
claim-validation `$expr`.

## Participant (models/Participant.js)

| Field | Type | Notes |
|---|---|---|
| `billId` | ObjectId ref Bill, required | |
| `name` | String, required | |
| `joinedAt` | Date, default now | |

## totals.service.js — output shape

`calculateBillTotals({ items, participants, taxPercent, tipPercent })`
returns:

```js
{
  claimedTotals: [{ participantId, amountCents }],
  unclaimedTotals: [{ participantId, amountCents }],
  taxTotals: [{ participantId, amountCents }],
  tipTotals: [{ participantId, amountCents }],
  finalTotals: [{ participantId, amountCents }],
  breakdown: [{
    participantId,
    claimedItemsTotalCents,
    unclaimedShareTotalCents,
    taxShareCents,
    tipShareCents,
    finalTotalCents,      // ← the field name to use when displaying a
  }],                     //   participant's final total. Confirmed exact
}                          //   name — do not assume, verify against this
                           //   file or the live source if it's ever
                           //   suspected to have changed.
```

`POST /:id/close` adds `upiLink` (string or `null`) to each entry in
`breakdown` before persisting it to `Bill.finalBreakdown` and returning it.

## API base path convention

All bill/item/participant routes are mounted at `/api/bills`. All OCR
routes are mounted at `/api/ocr`. Frontend's `API_BASE` already includes
`/api` — named API client methods (`api.createBill`, `api.claimItem`,
etc.) pass bare paths like `/bills` or `/ocr/extract`, never re-prefixed
with `/api/`.

## localStorage keys (frontend)

| Key pattern | Holds | Notes |
|---|---|---|
| `fairsplit_host_${billId}` | `{ _id, hostCode, shareCode, ... }` | Per-bill, NOT a single global key |
| `fairsplit_participant_${billId}` | `{ _id, name, billId }` | Per-bill |

If you ever see a bare `'fairsplit_host_bill'` (no `${billId}`) anywhere,
that's the old, buggy, single-global-slot version — it should not exist
in the codebase; flag it for removal on sight.
