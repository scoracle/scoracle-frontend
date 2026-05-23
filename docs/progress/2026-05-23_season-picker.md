# 2026-05-23 — Season picker (StatsCard + CompareCard, self-compare default)

## Goal

Surface the backend's per-season profile endpoint
(`GET /api/v1/{sport}/{entityType}/{id}?season=N`, documented in
scoracle-backend's ENDPOINTS.md) as a native `<select>` dropdown on
both StatsCard and CompareCard. The backend ships
`meta.available_seasons` per entity (newest-first list of valid season
values for that entity, scoped to the current league), so the picker
only ever offers seasons that resolve to populated payloads — no dead
options.

Placement (per the user-supplied mockups):
- **Compare card** — middle slot of `.compare-header`, between the
  primary entity pill (left) and the compare-search input (right).
- **Stats card** — new `.stats-header` row directly under the rate/
  scope toolbar, left-aligned in the same horizontal column where
  Compare's primary pill sits. Flipping Stats ↔ Compare on the same
  profile keeps the dropdown anchored to the same screen position.

Selection persists across tab switches within a profile (one signal on
`ProfileContext`) and across page reloads / share-links (synced to the
URL as `?season=N`). Selection is intentionally NOT carried into a
fresh entity profile — per the ENDPOINTS.md "Cross-entity navigation"
guidance, each profile loads at its own newest available season.

Self-compare: dropping the `excludeId` filter on `CompareSearch` lets
the user pick the same entity on both sides of Compare. When that
happens, the secondary fetch automatically targets the next-older
entry in `meta.available_seasons` (e.g. Cowboys 2025 vs Cowboys 2024)
so the chart isn't a self-mirror. If the primary is already on the
oldest season, the secondary falls back to the nearest other season
so a year-over-year compare still renders (just inverted).

## What Was Done

**Data layer**
- `entityUrl(sport, type, id, season?)` and
  `trendsUrl(sport, type, id, season?)` accept an optional season,
  emitting `?season=N` when set. Omitting it preserves the existing
  "serve newest" backend default.
- `getStats(sport, type, id, season?)` and
  `getTrends(sport, type, id, season?)` extended in lockstep.
  `query()`'s dedupe key is `[name, ...args]`, so the new season
  argument naturally partitions cache entries — fetching season=2024
  and season=2023 hit independent cache slots, no manual invalidation
  needed.
- `StatsResponseMeta` type added (`season`, `available_seasons`,
  `league_id`). The fetcher reads the envelope's `meta` field
  alongside the entity body and merges it onto the returned object so
  consumers can read `data.meta.available_seasons` without re-shaping.

**ProfileContext + URL sync**
- `season: Accessor<number | null>` + `setSeason(n)` added to
  `ProfileContextValue`. Initial value parsed from `?season=`; the
  setter syncs back via `setSearchParams({season}, {replace:true})`.
- Profile route's `preload` + `firePreloads` read the season from the
  URL too so the hover-warm path doesn't fetch the wrong season's
  payload.

**Shared component**
- `SeasonSelect.tsx` + `.css`: native `<select>` styled to match the
  inline-NavStrip aesthetic (italic display font, secondary text
  colour, custom CSS chevron). Single-option API: `seasons[]`, `value`,
  `onChange`. Renders nothing by itself when the parent decides to
  hide it (each card gates on `availableSeasons().length > 1`).

**StatsCard wiring**
- Imports `SeasonSelect`; pipes `ctx.season()` through `getStats`.
- New `.stats-header` row sits directly below the toolbar, hidden when
  only one season is available.
- `availableSeasons()` + `resolvedSeason()` memos pull from
  `data().meta`; the picker is controlled, `onChange` calls
  `ctx.setSeason`.

**CompareCard wiring**
- Same plumbing on the primary fetch.
- `compareSeasonFor(other)` resolves the secondary's season —
  `ctx.season()` for cross-entity, or one slot older in
  `available_seasons` for self-compare (with oldest-season fallback to
  the nearest other entry).
- New `.compare-header-slot.compare-header-season` middle slot in the
  header grid, centered horizontally in the gap between the primary
  pill and compare-search input. Hidden when only one season exists.
- `excludeId={primaryId}` dropped from `<CompareSearch>` and the prop
  itself made optional on `CompareSearchProps` so self-compare is
  selectable.

**Other consumers**
- `EntityMeta.tsx` (Rating chip), `TraitsCard.tsx`, `TrendsCard.tsx`
  all thread `ctx.season()` through their respective fetchers.
  Without these, switching season on Stats/Compare would leave the
  meta-card Rating, the Traits surface, and the Trends card pointing
  at the previous season's data — silent mismatch.

## Files Changed

- `src/lib/utils/data-sources.ts` — `entityUrl`, `trendsUrl` accept season
- `src/lib/data/stats.server.ts` — `StatsResponseMeta`, season arg,
  envelope-meta merge
- `src/lib/data/trends.server.ts` — season arg
- `src/contexts/profile.ts` — `season`/`setSeason` on context
- `src/routes/profile.tsx` — initial season from URL, setter syncs URL,
  preload + firePreloads thread season
- `src/components/solid/SeasonSelect.tsx` + `.css` — new shared component
- `src/components/solid/StatsCard.tsx` + `.css` — picker row,
  `getStats(..., ctx.season())`
- `src/components/solid/CompareCard.tsx` + `.css` — middle-slot picker,
  `compareSeasonFor`, dropped excludeId
- `src/components/solid/CompareSearch.tsx` — `excludeId` optional
- `src/components/solid/EntityMeta.tsx`, `TraitsCard.tsx`,
  `TrendsCard.tsx` — thread season

## Verification

- `npm run typecheck` — clean.
- `npm test` — 137/137 (no new tests; behaviour is pure plumbing on
  top of an existing well-tested categorizer).
- Backend smoke: `GET /api/v1/nfl/player/34?season=2023` returns
  `meta.season=2023`, `meta.available_seasons=[2025,2024,2023]`,
  `entity.stats.passing_yards=5234` — picker has real seasons to pick
  from for Mahomes.
- Dev-server SSR markup includes `.stats-header`, `.season-select`,
  and the existing `.stats-toolbar` — picker is in the document on
  cold load.

UI not driven end-to-end in the browser this commit — change is
mechanical plumbing on top of tested data paths. Quick manual flip
post-deploy on a multi-season profile (Mahomes / Cowboys) is the
cheap final check.

## Result

NFL / NBA / Football profiles with multiple available seasons now
show a native season dropdown on Stats and Compare. Selecting a year
re-fetches every season-scoped card (Meta Rating, Stats, Compare,
Traits, Trends) and persists across tab switches + reloads via
`?season=N`. Self-compare on Compare defaults the secondary one
season behind the primary, so Cowboys-vs-Cowboys lands on
2025-vs-2024 by default and tracks the primary as it moves.
