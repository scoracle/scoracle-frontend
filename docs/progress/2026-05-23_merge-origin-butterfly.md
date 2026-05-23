# 2026-05-23 — Merge origin/main: butterfly + cohort + trends

## Goal

Pull the three commits from origin/main that landed on the other machine
(arch laptop) and reconcile with the three local-only commits on this
archbox. Origin brought butterfly compare, per-entity percentile cohort
readouts, and the combined stats+vibes Trends card; local had position-
aware NFL stats, a Vibe/Overall meta readout via shared `tierColor`, and
the uniform Shell padding fix from earlier today.

## What Was Done

- Stashed in-progress local CompareCard scores work — superseded by
  origin's butterfly split where both entities share one chart.
- Merged with `git pull --no-rebase` to keep both branches' histories
  visible (solo project, but cleaner audit trail).
- Resolved StatsCard.tsx conflict: `ChartCell` now takes both
  `Slot & { cohort?: string | null }` (origin's "Compared to {cohort}s"
  line) **and** keeps the local `overallScore` tierColor readout below
  each chart — neither side loses its feature.
- Resolved CompareCard.tsx conflicts: kept both `resolvePositionGroup`
  (local NFL position-collapse helper) and the URL-backed
  `entityDataStore` setup (origin). Memos for `primaryPositionGroup`,
  `primaryCohort`, and `compareCohort` all coexist.
- Consolidated tier-color utils: origin's `tier-color.ts` (superset:
  `tierColor` + `tierColorFromDelta` + `LOWER_IS_BETTER`) is canonical;
  local's `score-tier.ts` (subset) deleted; EntityMeta, StatsCard, and
  VibeCard re-pointed at the canonical util. VibeCard had a stray
  duplicate import from auto-merge; cleaned up.

## Files Changed

- `src/components/solid/StatsCard.tsx` — conflict resolution
- `src/components/solid/CompareCard.tsx` — conflict resolution
- `src/components/solid/EntityMeta.tsx` — import re-point
- `src/components/solid/VibeCard.tsx` — drop duplicate import
- `src/lib/utils/score-tier.ts` — **deleted** (superseded)
- 19 other files from origin's three commits applied cleanly

## Verification

- `npm run typecheck` — clean
- `npm test` — 119/119 passing
- All conflict markers grepped to zero before commit

## Result

Local and origin are reconciled on `main` via merge commit `aa6cbfb`.
Per-entity Overall score work I was attempting before noticing the
divergence is moot — origin's butterfly chart replaces the dual-pizza
stack with a single butterfly per category, and the cohort line lives
in the header pills rather than per-chart. Revisit "scores in compare"
on top of the butterfly structure as a separate task if still desired.

The lesson here is also encoded in `CLAUDE.md` and the vault conventions
as the new session-start branch-sync rule — see the companion progress
doc `2026-05-23_session-start-convention.md`.
