# 2026-05-30 — Rating chip: show in-season rank, not composite score

## Goal

Swap EntityMeta's headline Rating chip from `season_composite_score`
(cross-season-comparable) to `season_composite_rank` (a uniform 0-100
percentile within this season's peer cohort, top of cohort = 100). The
in-season rank is the question a headline chip on a single-season
profile should answer: "where does this entity stand among peers this
season". The cross-season score still drives the TrendsCard "Rating ·
Season" sparkline + its headline number — that surface is about the
trajectory across the season, and the per-event sparkline below it
plots composite scores (not ranks), so a score-aligned headline is the
right fit there. Net: the two surfaces can legitimately differ now, and
the comment above the memo makes that explicit.

This is a "see how it looks" exploration commit — the field swap is
one line, the comment swap is the rest of the diff. Reverting is a
one-line flip if the divergence reads worse than the upside.

## What Was Done

`src/components/solid/EntityMeta.tsx`:

- `overallScore` memo now reads `stats()?.meta?.season_composite_rank`
  instead of `season_composite_score`. Same null-handling, same
  `Math.round`, same hide-when-null gate on the chip JSX.
- Comment block above the memo rewritten to explain the rank semantics
  + the deliberate divergence from the TrendsCard headline. The prior
  comment described why we'd previously moved FROM a frontend-computed
  percentile TO the composite score; that history is in git, the new
  comment is forward-looking and accurate to the current call.

Type plumbing for `season_composite_rank` (and the still-unconsumed
`season_composite_rank_alltime`) was already in place on
`StatsResponseMeta` — no data-layer edits this commit.

## Files Changed

- `src/components/solid/EntityMeta.tsx` (1 memo body + comment)

## Verification

- `npm run typecheck` — clean
- `npm test` — 141/141
- Diff inspected pre-commit: a single 25-line patch on
  `EntityMeta.tsx`, no cross-file edits, no styling/CSS changes.

## Result

EntityMeta's Rating chip now answers "how does this entity rank among
peers this season" with a uniform 0-100 number where top-of-cohort =
100. Expect dominant entities to read higher than they did under the
composite score (a strong team in a weak league now reads near 100
instead of e.g. ~72), and mid-cohort entities to spread out around 50.
The TrendsCard "Rating · Season" headline stays on the composite score
so its sparkline reads cohesively.

Committed against the post-rebase `f6f3c5f` baseline (local was 9
commits behind; pulled before applying this stashed change so the work
sits cleanly on top of the badge revert + Compare-into-Stats + News /
SSR / share-prune work that landed from the other machine).
