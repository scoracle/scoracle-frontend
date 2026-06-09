# 2026-06-09 — Uniform scopes + Regular/Fantasy selector

## Goal
Surface two backend additions (scoracle-backend migrations 045 + 046) in the profile UI:
(1) the uniform Per Season / Per Game / Per-X rate vocabulary across sports, and (2) a
new orthogonal **Regular | Fantasy** scoring-model selector that switches the Composite
headline to box-score fantasy points (PPR NFL / DraftKings NBA), with the rate selector
cross-applying.

## What Was Done
- **Phase 1 (uniform scopes):** `RateMode` += `per_season`; `VALID_RATES` updated;
  `RATE_OPTIONS` relabeled to the uniform vocabulary — NBA `[Per Season, Per Game, Per
  36]`, football `[Per Season, Per Game, Per 90]`, NFL `[Per Season, Per Game]` (the
  sport's `default` column set is labeled per its semantics). `ratingForMode` already
  resolves any mode → no change.
- **Phase 2 (fantasy):** new `ScoreModel = "regular" | "fantasy"` context axis +
  `?model=` URL sync (omitted when regular, preserving existing links). New `"model"`
  CardControl on the Composite tab → a **Model** `<Select>` rendered first in the
  ScopeStrip (Model · Rate · Scope · Season), gated to fantasy sports (nba/nfl) players
  with a `fantasy` block. `fantasyForMode(r, mode)` (falls back to the default block).
  CompositeCard headline branches on `scoreModel()`: Regular → z composite rank (as
  today); Fantasy → fantasy points (`NN.N pts`) with tier color by the fantasy
  percentile. **Slices unchanged**; Specialist pillar stays z-based (no Model control).

## Files Changed
- `src/contexts/profile.ts` — `RateMode` += per_season; `ScoreModel` type + accessors.
- `src/routes/profile.tsx` — `VALID_RATES`/`VALID_MODELS`; `?model=` + scoreModel wiring.
- `src/components/solid/ContentShell.tsx` — `RATE_OPTIONS` relabel; `MODEL_OPTIONS` +
  `fantasySupported` + `showModel` gate + the Model `<Select>`.
- `src/components/solid/card-registry.tsx` — `CardControl` += `"model"`; composite controls.
- `src/lib/data/sparkline.server.ts` — `FantasyBlock` type + `fantasy` field + `fantasyForMode`.
- `src/components/solid/CompositeCard.tsx` — fantasy headline branch (`scopedComposite`/`cardScore`).
- `src/lib/data/sparkline.test.ts` — `fantasy: null` fixture + 3 `fantasyForMode` tests.

## Verification
- `npm run typecheck` clean; `npm test` 117 passed (was 111 → +3 fantasy, +3 from prior).
- Backend payload validated separately on throwaway Postgres (fantasy_block shape).
- Not deployed. Deploy AFTER backend migrations 045 → 046 + Go redeploy (the `fantasy`
  block must be served before the UI reads it). OG share still renders Regular in
  fantasy view (deferred follow-on).

## Result
The profile Composite tab gains a uniform rate vocabulary and a Regular/Fantasy toggle;
fantasy shows total/per-game/per-x fantasy points as the headline. Frontend green;
pending backend deploy.
