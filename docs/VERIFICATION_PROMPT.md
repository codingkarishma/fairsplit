# FairSplit — Reusable Verification Prompt

Paste this whenever an AI tool claims something is "done," "fixed," or
"complete" and you want proof instead of a summary. Fill in the bracketed
parts. Don't skip this for anything touching money math, concurrency, or
a schema field name — those are where every real bug tonight actually hid.

---

```
Before I accept this as done, prove it — don't summarize it.

1. Show me the ACTUAL current content of [file name(s)], in full, as it
   exists on disk right now. Not a diff, not a description — the real
   file content.

2. Run `node --check` on every changed file and paste the raw terminal
   output.

3. [If this touches money/concurrency/a schema field:] Run a real test —
   [describe the specific action: e.g. "create a bill, claim an item with
   a custom amount, close it"] — and paste the actual raw response/output.
   I will compare it against my own hand-calculated expected value before
   accepting this.

4. If a previous summary claimed this was already done, and it wasn't —
   say so plainly. I'd rather know now than find out three steps later.

Do not tell me this is complete unless all of the above is shown with real
output, not prose. If something can't be verified right now (e.g. the
server isn't running), say that explicitly instead of describing what
*should* happen.
```

---

## Quick variants for common situations

**When a field name is in question:**
> "Before writing this code, open [file] and quote me the exact line
> where [field] is defined. Confirm the literal name — we've had
> multiple bugs tonight from assumed field names that didn't match
> reality (`price` vs `priceCents`, `taxAmount` vs `taxPercent`)."

**When a fix was "already applied" according to a previous session:**
> "You said this is already present in the working tree — I have not
> verified that myself. Show me the real current file content, run
> node --check, and if this touches business logic, show me a real
> test run. 'Already present' is not the same as 'verified.'"

**When you need proof something persists, not just computes correctly:**
> "Show me this working end-to-end: [action] → [reload/refetch] →
> confirm the SAME result appears after the reload. Code that computes
> the right answer once but doesn't persist it is not the same as a
> working feature."

**When output was truncated or unclear:**
> "The output you showed me is truncated/incomplete — I can't verify
> anything from it. Paste the complete, untruncated content again."
