# 2026-06-03 — Percentile grade display fixes (composite-100 + specialist headline)

## Goal

Fix two reported display bugs on the rating cards:
1. **Composite "everyone's a 100"** — the top ~15 football players all showed `100`.
2. **Specialist headline mismatch** — Garnacho's specialist read `38` while his skills
   showed 70+ in the grid, and the hero skill looked wrong.

Both were *rendering* bugs; the backend data was correct.

## What Was Done

- **1-decimal percentile everywhere we show a 0–100 grade** (was `Math.round`, which
  collapsed 99.5–100.0 → `100`). Now only the literal #1 reads `100.0`; the elite tail
  is distinct (`99.9`, `99.8`…). Surfaces: `CompositeCard` headline, `EntityMeta`
  Composite cell, `LeaderboardCard`, `SpecialistCard` hero + grid.
- **Specialist headline now reads the specialty skill's OWN percentile** (the
  `is_specialty` datapoint's `pct`) instead of `rating_specialist_rank`
  (peak-z-among-everyone's-peak — a different, harsher denominator that read confusingly
  low next to the per-skill pcts). `SpecialistCard` hero + `EntityMeta` Specialist cell.
  → Garnacho now headlines "Creation 83.0", consistent with the grid, not 38.
- **LeaderboardCard** shows the 0–100 percentile grade (1 decimal) rather than raw z.

Root-cause note: `rating_composite_rank` is a percentile, which compresses the elite to
99–100 — correct data, but `Math.round` made many identical 100s. Specialist had two
percentile denominators (per-skill pct vs peak-z-among-peers); the card now uses the
per-skill one, matching what the grid shows.

## Files Changed

- `src/components/solid/CompositeCard.tsx`
- `src/components/solid/SpecialistCard.tsx`
- `src/components/solid/EntityMeta.tsx`
- `src/components/solid/LeaderboardCard.tsx`

## Verification

- `npm run typecheck` — clean.
- Backend already serves the inputs (`rating_composite_rank`, per-datapoint `pct`,
  `is_specialty`); this is display-only.

## Result

Only one `100.0`; the specialist headline is consistent with the grid. Local/uncommitted
until a `cf:deploy` (separate from this commit). Leaderboard z-vs-percentile is an open
preference (raw z spreads the board more — flagged to Scott).
