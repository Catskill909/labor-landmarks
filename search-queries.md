# Search Audit & Plan — Labor Landmarks Map

*Prompted by feedback from Saul Schniderman, April 2026*

---

## Background

Saul Schniderman (LHF co-founder, Board Chair, former Library of Congress cataloger) raised a precise and important concern:

> "I wanted to search 'Bloomington Workers' Memorial' in Bloomington, Illinois. I entered 'Bloomington' and received 3 hits. But then I typed 'Bloomington Illinois' and received nothing."

This is a real bug, not user error. Saul's instinct — shaped by decades of professional cataloging — is exactly right. A well-designed search should have returned those same 3 results whether he typed "Bloomington", "Bloomington IL", or "Bloomington Illinois".

---

## What Saul Gets Right About Information Architecture

Saul's cataloging background is directly relevant here. He notes the pre-free-text era required catalogers to anticipate every variant a searcher might use — hyphenated vs. unhyphenated, abbreviated vs. full. Modern free-text search is *supposed* to dissolve that burden. Our old implementation didn't — it was closer to the old field-matching paradigm, without any of its rigor.

- A cataloger would have entered both `IL` and `Illinois` as search terms. We only stored `IL`.
- A cataloger would have normalized punctuation. We passed apostrophes through literally.
- Free-text search *should* handle `"Bloomington Illinois"` gracefully. It didn't.

---

## Bug Inventory — Status After Fix (April 3, 2026)

### Critical — All Fixed

| Query | Before | After | What Changed |
|---|---|---|---|
| `Bloomington Illinois` | 0 results | 3 results | Words now split and matched independently |
| `Bloomington IL` | 0 results | 3 results | Words now split and matched independently |
| `workers Bloomington` | 0 results | 3 results | Word order no longer matters |

### High — All Fixed

| Query | Before | After | What Changed |
|---|---|---|---|
| `Illinois` | 0 results | All IL landmarks | State abbreviation ↔ full name mapping added |
| `Indiana` | 0 results | All IN landmarks | Same — all 50 states + DC mapped |
| `Bloomington Workers Memorial` | 0 results | 1 result | Apostrophes stripped before matching |
| `Bloomington ` (trailing space) | 0 results | 3 results | Input trimmed before processing |

### Medium — Partially Addressed

| Query | Before | After | Notes |
|---|---|---|---|
| `union hall chicago` | 0 results | Works | Multi-word AND logic now handles this |
| Anything in description | 0 results | Works | Description field now searched |
| Anything in address | 0 results | Works | Address field added (April 3, 2026) |

---

## What Was Changed (April 3, 2026)

Both files were updated with identical logic.

### `src/App.tsx` (public-facing search)

**Old algorithm:**
```
take entire query as one string → lowercase → does it appear in name? city? state?
```

**New algorithm:**
```
trim → lowercase → strip apostrophes/hyphens → split on whitespace
→ for each word: does it appear in name, city, state, full-state-name, or description?
→ ALL words must match (AND logic)
→ category filter still applied separately
```

**Specific changes:**
- `STATE_FULL_NAMES` lookup table added (all 50 US states + DC, abbreviation → full name)
- `normalize()` helper strips apostrophes and hyphens before comparison
- Query is split into individual words; every word must match at least one field
- State field expanded: `"IL"` becomes `"il illinois"` so either form matches
- `description` field now included in the search target
- `.trim()` applied before splitting

### `src/components/AdminDashboard.tsx` (admin search)

Same logic applied. Was a verbatim copy of the old broken algorithm — now fixed to match the public search behavior.

---

## What Was NOT Changed

- The category filter (dropdown) — separate system, works correctly
- The database schema — all fixes are in the filtering logic, not stored data
- Server-side API — search remains client-side (appropriate for current dataset size)
- Address field — not yet added to search target (see Remaining Work below)

---

## Remaining Work

### Near-term
- ~~**Address field**~~ — Done (April 3, 2026). `address` added to search target in both `App.tsx` and `AdminDashboard.tsx`.

### Future (when dataset grows)
Move search to the backend using SQLite FTS5 (Full Text Search):
- `GET /api/landmarks?q=Bloomington+Illinois` returns only matching records
- SQLite FTS5 handles tokenization, stemming, and ranking natively
- Reduces payload size and improves performance at scale
- Not urgent at current 336-landmark dataset size

---

## A Note for Saul

The fix is live in the codebase. Searching "Bloomington Illinois" now returns all 3 Bloomington, IL landmarks — same as searching "Bloomington" alone. The same is true for any state: "Illinois", "Indiana", "New York" all work, as do abbreviations.

The catalog-era intuition — that you need to anticipate every variant a searcher might use — was exactly the right diagnosis. The fix makes the search behave the way a modern free-text engine should: split the words, match across fields, and reconcile abbreviations with full names automatically.
