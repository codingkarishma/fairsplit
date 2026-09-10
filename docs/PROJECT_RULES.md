# FairSplit — Locked Project Rules

Paste this entire file at the start of every new AI session working on this
project (Cline, Copilot, a fresh chat, anything). These are decisions
already made, with reasoning — do not re-litigate them without a specific
new reason. If a suggestion contradicts a rule below, the suggestion is
wrong until proven otherwise, not the rule.

## Core split logic

1. **No quantity cap on claiming.** Any participant can claim or unclaim
   any item at any time. `quantity` on an Item is informational only
   (shown to the host for OCR sanity-checking) — it never limits how many
   people can claim an item.

2. **Claim/unclaim must be atomic**, using MongoDB `findOneAndUpdate` with
   `$push`/`$pull` and a query guard — never read-then-write. A participant
   can only claim a given item once (guarded by `'claims.participantId': {$ne: participant._id}`
   on claim); unclaiming uses `$pull`.

3. **Item price splits evenly among current claimants.** If nobody has
   claimed an item by the time the bill closes, its price splits evenly
   across ALL participants in the bill, not just claimants — nothing is
   left unassigned.

4. **All money math uses integer cents, never floating-point decimals.**
   When splitting N cents among K people: `base = Math.floor(N/K)`,
   `remainder = N % K`, remainder cents go one each to the first
   `remainder` participants sorted by `_id` (deterministic order). This
   must always sum back exactly to the original total.

5. **No Socket.io, no real-time push.** Claiming is plain REST. Frontend
   refetches after each action or on a polling interval. This was a
   deliberate simplification — the real concurrency problem (atomic
   claim/unclaim) is solved at the database layer regardless of transport.

6. **The close response must show claimed vs. unclaimed vs. tax vs. tip as
   separate fields** (`claimedItemsTotalCents`, `unclaimedShareTotalCents`,
   `taxShareCents`, `tipShareCents`, `finalTotalCents`) — never collapsed
   into one opaque number.

## Access control

7. **Two-code system.** `shareCode` (public, given to all participants) —
   required as `X-Share-Code` header or body field for join/claim/unclaim.
   `hostCode` (secret, known only to the bill creator) — required as
   `X-Host-Code` header for host-only actions (edit items, publish, close).
   Never accept hostCode as a query param (leaks into logs/browser history).

8. **Once a bill is `closed`, claim/unclaim/edit endpoints reject with 409.**
   The close route flips status to `closed` atomically BEFORE fetching
   items for totals calculation — this closes the race window where a
   claim could sneak in between totals computation and finalization.

9. **Host cannot override or remove another participant's claim.**
   Deliberately rejected — if Person A could edit Person B's claims, that
   creates an accountability/trust problem worse than the inconvenience it
   solves. If someone claims the wrong item, they fix it themselves by
   unclaiming. This is a product decision, not a technical limitation.

10. **Item editing (`PATCH /:id/items/:itemId` and bulk
    `PATCH /:id/items`) only works while `status === 'draft'`** — before
    the bill is published and people start claiming. Protected by hostCode.

## Currency & payments

11. **Currency is set once per bill, one of `INR`/`GBP`/`USD`, no
    conversion, ever.** Every amount on that bill (items, claims, tax,
    tip, totals) is in that one currency. There is no exchange-rate
    lookup, no cross-currency math, anywhere in the app.

12. **UPI payment links only work for `currency === 'INR'`.** UPI is
    India's payment system and cannot settle GBP/USD — this is a real
    limitation of UPI itself, not a missing feature. For non-INR bills,
    `upiLink` is always `null`.

13. **`hostUpiId` is loosely validated** (`/^[\w.-]+@[\w.-]+$/`, i.e.
    `name@bank` shape) at bill creation — never verified as a real
    registered UPI ID (not possible client-side). `hostName` must be
    URL-encoded before insertion into the UPI link query string.

14. **No real payment gateway integration** (Razorpay/Stripe/etc.). This
    app generates a payment intent link only — it never processes,
    confirms, or reconciles actual payment. A real gateway would require
    proper authentication (not just link-possession) and is out of scope.

## Tax, tip, and custom amounts

15. **Tax and tip split evenly across ALL participants**, not
    proportionally to what each person claimed. Uses the same integer-cent
    rounding rule as item splits.

16. **Tax/tip are percent-based** (`taxPercent`/`tipPercent`, 0–100,
    applied to the item subtotal), not flat amounts. The old flat-amount
    fields (`taxAmount`/`tipAmount`) were removed as dead code once
    percent-based fields were introduced with a non-`undefined` default.

17. **Custom claim amounts (uneven splits) are optional per claim**
    (`customAmountCents`, integer or `null`). If ALL claims on an item are
    `null`, split evenly (rule 3/4). If some are set, those participants
    owe exactly that amount; the remainder splits evenly among the `null`
    claimants. The sum of set `customAmountCents` on an item can never
    exceed the item's price — **this check must be enforced atomically**,
    inside the same `findOneAndUpdate`/`$expr` as the claim write itself,
    never as a separate read-then-check-then-write step (that would
    reintroduce the exact race condition rule 2 exists to prevent).
    If every claimant sets a custom amount and they don't sum to the full
    price (no `null` claimant to absorb the remainder), closing fails with
    an error naming the specific item — this is an intentional dead-end
    requiring human resolution, not a bug to silently paper over.

## OCR

OCR line-filtering is a best-effort keyword/pattern list, not a parser.
The host review screen is the correctness guarantee, not the regex.
Expect several non-item lines per receipt to need manual deletion — this
is expected behavior, not a bug to keep chasing. Never add a filter that
could silently drop a real item to catch a junk line; a visible junk line
is recoverable, a missing item is not.

## Real-time updates

Real-time updates (Socket.io, live push, room-based presence, chat,
reminders/nudges) were evaluated and explicitly deferred to V2. V1 uses
REST + polling (JoinPage.jsx refetches every 5 seconds) — this is a
deliberate, locked decision, not an unfinished feature. Do not introduce
Socket.io, 'rooms', chat, or reminder features in V1 — all of these
depend on a real-time transport layer that doesn't exist and is out of
scope until V2 is explicitly started as its own separate task with its
own design pass.

## Infrastructure

18. **No Redis.** MongoDB's atomic conditional updates (`findOneAndUpdate`
    with `$expr`/`$push`/`$pull`) already solve every concurrency problem
    in this app for a single-database deployment. Redis would add
    infrastructure without solving anything not already handled.

19. **No database migration off MongoDB.** The document model fits the
    bill/item/claim structure naturally, and every concurrency requirement
    has been solved and verified with Mongo's native atomic operators.
    "Other apps use Postgres+Redis" is not a reason to switch — it means
    that's _a_ valid stack, not that this one is wrong.

20. **Final close results are persisted, never recomputed client-side.**
    `POST /:id/close` writes its computed `breakdown` (including UPI
    links) onto the Bill document as `finalBreakdown`. The frontend reads
    this stored value — it does NOT independently reimplement the split
    math. Two independent implementations of the same money math is a
    known bug source (found and fixed once already) — don't reintroduce it.

21. **Host localStorage keys must be namespaced per bill**
    (`fairsplit_host_${billId}`), matching the pattern already used for
    participants (`fairsplit_participant_${billId}`). A single global key
    causes a host to lose access to a previous bill when creating a new one.

22. **HEIC image upload is a known, documented V1 limitation**, not a
    silent gap — iPhones default to HEIC, which isn't in the accepted
    mimetype list. State this explicitly in the README/upload UI rather
    than letting it surprise a real user.

23. **Production hardening, minimal and specific — no scope creep here
    either:** CORS restricted to the real frontend origin via an env var
    (not wide open `cors()`), `express-rate-limit` with an in-memory store
    (no Redis) on `POST /bills` and `POST /ocr/extract` specifically,
    since those are the only unauthenticated write/compute-heavy routes.

## The meta-rule

24. **Never accept "done" from a prose summary.** Every fix must be
    verified by: (a) reading the actual current file content, not a
    description of the change, (b) running `node --check` on changed
    files, (c) for anything money- or concurrency-related, an actual test
    run with real output compared against a hand-calculated expected
    value. If a summary and the real file ever disagree, trust the file.
