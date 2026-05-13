# 2026-05-12 — Per-rate coverage + percentile scope toggle

## Goal

Wire the two product gaps from the scoracle-data 2026-05-12 drop
(`2026-05-12_per-rate-and-scoped-percentiles.md`) into the flagship:

1. **Per-rate coverage.** NBA backfilled 8 new `*_per_36` keys and
   Football 31 new `*_per_90` keys, but the frontend rate-mode chart
   slots only used a handful of them — the rate view looked sparse next
   to per-game.
2. **Percentile scope.** The backend now ships a sibling
   `scoped_percentiles` column (NBA/NFL: position × conference; Football:
   position × league for players, league for teams). Users need a simple
   toggle to flip between sport-wide and scoped percentile rings.

Same toggle pattern as the existing Per Game / Per 36 toggle, available
on Stats, Compare, and Traits.

## What Was Done

**Type-level extension (`stats.server.ts`).** `StatsResponse` now carries
`percentile_metadata`, `scoped_percentiles`, and
`scoped_percentile_metadata`. The metadata interfaces are exported so
downstream code can read `scope_name`, `sample_size`, etc.

**Context (`profile.ts` + `profile.tsx`).** New
`percentileScope: "all" | "scoped"` signal on `ProfileContext`,
defaulted to `"all"`. Shared across Stats / Traits / Compare so a flip
on one subtab persists when the user moves to another. Wired in the
provider in `profile.tsx` alongside the existing tab signals.

**Categorizer (`stats-categorizer.ts`).** Two new helpers — `pickPercentiles(data, scope)`
returns the right normalized percentile map for the selected scope,
falling back to `all` when scoped data is missing. `hasScopedPercentiles(data)`
gates the toggle visibility. `RATE_CATEGORY_CONFIG` and
`CHART_RATE_CATEGORY_CONFIG` expanded to cover the new per-rate keys
(NBA: oreb/dreb/fgm/fga/fg3m/fg3a/ftm/fta/tov/pf per_36; Football: ~30
keys spanning xG, shots-on-target, passes, crosses, dribbles, duels,
clearances, blocks, ball recovery, aerials, fouls, dispossessed,
possession lost, saves, etc.). `STAT_LABELS` and `STAT_ABBREVS` gained
matching entries; legacy `aeriels_won_per_90` typo from the data layer
is preserved verbatim.

**Tabs.** `StatsTab`, `CompareTab`, and `TraitsTab` each read
`ctx.percentileScope()`, pipe it through `pickPercentiles`, and render
the scope toggle as a sibling of the existing rate toggle (or as a
standalone toggle in Traits' case). Right-button label comes straight
from `scoped_percentile_metadata.scope_name` — so the user sees "West",
"AFC", "Premier League", "La Liga", etc. instead of a generic
"Conference"/"League" label. Toggle hidden when scoped data is missing.

**CSS (`StatsTab.css`).** Added a `.scope-toggle` modifier on top of
`.rate-toggle` to give the stacked toggles + traits list a 0.5rem
bottom padding so the layout breathes.

## Files Changed

- `src/lib/data/stats.server.ts` — `StatsResponse` extension +
  `PercentileMetadata` / `ScopedPercentileMetadata` exports.
- `src/contexts/profile.ts` — `percentileScope` accessor/setter +
  `PercentileScope` type.
- `src/routes/profile.tsx` — wire signal into the provider.
- `src/lib/utils/stats-categorizer.ts` — `pickPercentiles` +
  `hasScopedPercentiles` helpers; expanded `RATE_CATEGORY_CONFIG`,
  `CHART_RATE_CATEGORY_CONFIG`, `STAT_LABELS`, `STAT_ABBREVS`.
- `src/components/solid/StatsTab.tsx` — scope toggle render + scope-aware
  percentile pick.
- `src/components/solid/CompareTab.tsx` — same wiring for both primary
  and compare entities.
- `src/components/solid/TraitsTab.tsx` — scope toggle render +
  scope-aware strengths/weaknesses; pulls `StatsTab.css` for shared
  toggle chrome.
- `src/components/solid/StatsTab.css` — `.scope-toggle` modifier.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 92/92 pass (no test changes).
- `npm run dev` — Vite boots in ~250 ms with no warnings; profile route
  SSRs 200 / ~64 KB; both `rate-toggle` and `scope-toggle` class strings
  present in the rendered tree.
- Live API spot-checks against `api.scoracle.com`:
  - NBA player 3 (Steven Adams, C, HOU): `scoped_percentiles` present,
    `scope_name: "West"`, `sample_size: 32` — matches the data team's
    expected payload.
  - NBA team 18 (Timberwolves): `scoped_percentiles` present,
    `scope_name: "West"`, `sample_size: 15`.
  - Football player 186882 (Aarón Escandell): 36 `*_per_90` keys present
    including the new `aeriels_won_per_90`, `ball_recovery_per_90`,
    `big_chances_created_per_90`, `chances_created_per_90`,
    `blocks_per_90`, `clearances_per_90`; `scope_name: "La Liga"`,
    `sample_size: 35`.

Manual click-through in a real browser (toggle flip → ring colors
redraw, scope-aware strengths/weaknesses on Traits) is the one piece
that still needs eyeballs.

## Result

Two new toggles compose into the same line-quiet UI: the existing
Per Game / Per 36 (or 90) toggle and a new All NBA / West (or All
Football / Premier League) scope toggle. The toggles are independent —
a user can look at Per-90 stats compared against just their conference,
or per-game stats compared against the whole sport. State is shared via
ProfileContext, so flipping the scope on Stats carries over to Traits
and Compare without losing context. Rate-mode chart slots now use the
full per-rate stat set the data layer ships, so high-volume role
players visibly separate from bench players on FGA, passes, duels,
crosses, etc.
