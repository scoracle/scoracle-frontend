# 2026-05-21 — Percentile cohort disclaimer on StatsCard + TraitsCard

## Goal

Percentiles on StatsCard and TraitsCard are computed against a
position-partitioned cohort on the backend (Cade Cunningham's "100th
percentile" is among Guard-Forwards, not all NBA players). Users had
no way to see *which* cohort drove the comparison — and entity meta
positions can't be inferred from, because the percentile partition is
keyed off a stricter `position_group` field on the stats payload.

Surface that cohort as a small disclaimer on both cards.

## What Was Done

Added a tiny scope-aware lookup that pulls the right `position_group`
based on which percentile set the user is viewing
(`percentile_metadata` for All, `scoped_percentile_metadata` for the
conference/league scope):

- `src/lib/utils/stats-categorizer.ts` — new `pickCohortPosition(data,
  scope)`, co-located with the existing `pickPercentiles` since they
  follow the same scope semantics.

Wired it into both consumers as a player-only memo (teams have no
position concept, so the disclaimer hides itself for team profiles
and for any player whose payload lacks `position_group`):

- `src/components/solid/StatsCard.tsx` — `cohortPosition` memo piped
  into `ChartCell` as a `cohort` prop; each per-category card renders
  `Compared to {cohort}s` directly under the category label, tucked
  tight under the heading rather than honoring the `.stats-cell` gap.
- `src/components/solid/TraitsCard.tsx` — same memo, single
  `Compared to {cohort}s` line inside the Shell, centered above the
  Strengths section.

CSS additions match the existing muted-tone aesthetic — italic,
tertiary text, smaller than the category label:

- `src/components/solid/StatsCard.css` — `.category-chart-cohort`
  with a `-0.375rem` top margin to overlap the cell's gap.
- `src/components/solid/TraitsCard.css` — `.traits-card-cohort` with
  centered text and a `1rem` bottom margin.

Wording was iterated with the user: settled on
`Compared to {position}s` — terse, plain plural. Sport label format
is shipped raw from the backend, so NBA reads
`Compared to G-Fs`, NFL reads `Compared to Quarterbacks`, football
reads `Compared to Attackers`.

## Files Changed

```
src/components/solid/StatsCard.tsx
src/components/solid/StatsCard.css
src/components/solid/TraitsCard.tsx
src/components/solid/TraitsCard.css
src/lib/utils/stats-categorizer.ts
docs/progress/2026-05-21_percentile-cohort-disclaimer.md  (NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 110/110 passing.
- Live API confirmation against `api.scoracle.com` before
  implementation: Cade Cunningham (NBA 17896075) returns
  `position_group: "G-F"`, Dak Prescott (NFL 25) returns
  `"Quarterback"`, Noni Madueke (football 25217662) returns
  `"Attacker"`. Both `percentile_metadata` and
  `scoped_percentile_metadata` carry the field for all three.
- Browser sweep via headless Chromium across all three players ×
  Stats + Traits tabs, plus an NBA team profile: disclaimer renders
  with the expected position on every player view, absent on the team
  view, zero console/page errors.

## Result

Users can now see the position cohort driving the percentile
comparison on every player's StatsCard (per chart) and TraitsCard
(once, above Strengths). The disclaimer is reactive to the
All ⇄ scoped toggle and hides itself cleanly when there's no
applicable cohort (teams, or rare players missing `position_group`).

## Notes / follow-ups

- Backend ingest uses coarse NBA position buckets (G / F / C / G-F /
  F-C) rather than BDL's finer set (PG / SG / SF / PF / C). The
  disclaimer will auto-upgrade to the finer labels if and when the
  backend re-ingests with the granular positions — no frontend
  change required.
- `EntityMeta.tsx` reads `meta.detailed_position || meta.position`,
  but `detailed_position` was absent from all three sampled
  payloads. The chained fallback may be dead code for the common
  case; not actioned here.
