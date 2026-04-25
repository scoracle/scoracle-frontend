# Phase 3a — shared plumbing port

**Date:** 2026-04-25
**Scope:** Port types, lib/utils, lib/charts, lib/data, stores, public/data, and the fetch-autofill script from `~/Scoracle` (Astro) into `~/scoracle-frontend`. Set up build-time env plumbing.

## Goal

Land the framework-agnostic foundation that Phase 3b (home `/`) and Phase 3c (profile + tabs + Compare flow + X tab) will consume. Per the plan refinement, Phase 3a covers "shared plumbing (types, lib/utils, stores, public/data, headers)." Headers shipped in `2026-04-25_phase-2-finish.md`; this commit handles the rest.

The port is intentionally mechanical — these files were authored against vanilla TS / nanostores, no Astro-specific imports — so most of them ported verbatim. The work was identifying SSR-safety risks and wiring up the build-time constants the lib expects.

## What Was Done

### Hydration audit (per plan refinement)

`grep -nE '^(window\.|document\.|navigator\.)'` against `~/Scoracle/src/lib/**/*.ts` and `~/Scoracle/src/stores/*.ts` returned no top-level browser globals — every browser API call sits inside a function body.

Four files use browser APIs at all:

| File | Usage | SSR-safe at module load? |
|---|---|---|
| `lib/utils/dom.ts` | `document.createElement`, `window.location.search` inside function bodies | ✅ Module load is clean. Functions will throw if called during SSR — callers (components in Phase 3b/3c) must guard with `onMount` or `isServer`. |
| `lib/utils/url.ts` | `window.location.origin` inside `sanitizeUrl` (try/catch wrapped) | ✅ try/catch catches the ReferenceError on server; returns empty string. |
| `lib/utils/api-fetcher.ts` | `localStorage` inside `loadEtags`/`saveEtag`, both guarded by `typeof localStorage === 'undefined'` checks | ✅ Explicit guards. |
| `stores/sport.ts` | `sessionStorage`/`localStorage` in `readPersistedSport()`, called at module import via `atom<string>(readPersistedSport())` | ✅ try/catch wrapper catches ReferenceError on server; returns `'nba'` default. |

Conclusion: ports are SSR-safe at module load. Component-level guards (Phase 3b/3c) will be needed when components actually invoke `dom.ts` helpers during SSR — flagged for those phases.

### Files ported

`src/lib/types/`:
- `index.ts` — sport config (single source of truth), `EntityType`, `SportId`, `AutocompleteEntity`, `PlayerMeta`, `TeamMeta`, `SportMetaData`, `NewsArticle`, `NewsData`.

`src/lib/utils/` (15 files, dropped `component-bus.ts` per plan):
- `api-fetcher.ts` — SWR cache + request dedup + ETag support + page-data store + `fetchTwitterStatus`.
- `autocomplete.ts` — `AutocompleteManager` class. (Used by legacy `ComparisonSearchModal`; kept in case the new Compare flow reuses it. Drop later if not.)
- `co-mentions.ts` — co-mention analysis utilities.
- `data-sources.ts` — Go API URL builders, `FetchTarget` shapes.
- `date.ts`, `season.ts` — date/season helpers.
- `dom.ts` — `escapeHtml`, `parseEntityParams`, `showState`, `showWidgetState`. (Browser-globals — see audit.)
- `entity-colors.ts` — resolve entity → color tokens for Compare views. Uses `lib/data/team-colors`.
- `entity-data-store.ts` — singleton preloading bundled per-sport JSON for instant autocomplete + meta hydration. Uses `__DATA_VERSION__` build constant.
- `player-metrics.ts` — height/weight formatting.
- `position-groups.ts` — position normalization per sport.
- `search-normalize.ts` — query normalization for autocomplete.
- `serialize.ts` — safe JSON serialization for HTML embedding.
- `stats-categorizer.ts` — stats grouping/categorization.
- `url.ts` — `sanitizeUrl` for link safety. (Browser-globals — see audit.)

`src/lib/charts/`:
- `arc-math.ts` — SVG arc helpers (used by `PizzaChart` in Phase 3c).

`src/lib/data/`:
- `team-colors.ts` — per-team color tokens (NBA/NFL/Football). Consumed by `entity-colors.ts`.

`src/stores/` (5 files):
- `sport.ts` — `$currentSport` atom + `setSport()`. SSR-safe via try/catch.
- `entity.ts` — `$entityInfo` atom + `setEntityInfo()`. Cleaned a stale `component-bus`/`setPageData('widget')` comment from the Astro era.
- `news.ts` — `$newsArticles` atom (published by NewsTab, consumed by CoMentionsTab).
- `stats.ts` — `$statsData` atom (published by StatsTab, consumed by TraitsTab).
- `tweets.ts` — published by the X/Twitter tab, consumed by Co-mentions.

`public/data/` (6 JSON files): `nba.json`, `nba-meta.json`, `nfl.json`, `nfl-meta.json`, `football.json`, `football-meta.json`. Total ~3.7 MB on disk; served as static assets.

`scripts/fetch-autofill.mjs` — refresh script that hits the Go API's `/{sport}/meta` endpoints and writes the bundled JSON to `public/data/`. Wired into `package.json` as `npm run fetch-data`.

### Build-time wiring

- `vite.config.ts`:
  - `define: { __DATA_VERSION__: JSON.stringify(Date.now().toString()) }` — replicates the Astro config's build-time data-version stamp. `entity-data-store.ts` uses this to bust localStorage caches when the bundled JSON refreshes.
  - `envPrefix: "PUBLIC_"` — matches the Astro repo's convention so `PUBLIC_GO_API_URL` ports across without renames. Vite's default `VITE_` prefix would have required renaming every env-var reference in the lib.
- `src/env.d.ts` — ambient declarations for `__DATA_VERSION__` and the `ImportMetaEnv.PUBLIC_GO_API_URL` shape, ported from Astro's `env.d.ts` with the triple-slash reference swapped from `astro/client` → `vite/client`.

### Drops vs the Astro repo

- `src/lib/utils/component-bus.ts` — legacy comparison feature (`ComparisonSearchModal.astro` triad). Plan flags drop. Confirmed not imported by any `lib/utils/*` we kept.
- The legacy `ComparisonSearchModal.astro` / `StatsComparison.astro` / `ComparisonWidget.astro` Astro components — never coming over (Phase 3c uses the new user-driven Compare flow instead).

## Files Changed

Added (32 files):

```
public/data/football-meta.json
public/data/football.json
public/data/nba-meta.json
public/data/nba.json
public/data/nfl-meta.json
public/data/nfl.json
scripts/fetch-autofill.mjs
src/env.d.ts
src/lib/charts/arc-math.ts
src/lib/data/team-colors.ts
src/lib/types/index.ts
src/lib/utils/api-fetcher.ts
src/lib/utils/autocomplete.ts
src/lib/utils/co-mentions.ts
src/lib/utils/data-sources.ts
src/lib/utils/date.ts
src/lib/utils/dom.ts
src/lib/utils/entity-colors.ts
src/lib/utils/entity-data-store.ts
src/lib/utils/player-metrics.ts
src/lib/utils/position-groups.ts
src/lib/utils/search-normalize.ts
src/lib/utils/season.ts
src/lib/utils/serialize.ts
src/lib/utils/stats-categorizer.ts
src/lib/utils/url.ts
src/stores/entity.ts
src/stores/news.ts
src/stores/sport.ts
src/stores/stats.ts
src/stores/tweets.ts
docs/progress/2026-04-25_phase-3a-shared-plumbing.md
```

Modified:
- `package.json` — added `fetch-data` script.
- `vite.config.ts` — added `envPrefix: "PUBLIC_"` and `define.__DATA_VERSION__`.
- `src/stores/entity.ts` — dropped a stale comment about `component-bus` and `setPageData('widget')` from the Astro era.

## Verification

- `npm run typecheck` → clean after fixes (initial run flagged the missing `lib/data/team-colors.ts` file and the missing `__DATA_VERSION__` ambient declaration; both addressed).
- `vite dev` → still boots in **~258 ms**.
- `curl http://localhost:5175/` → still HTTP 200, 5934 bytes (no regression — routes don't import the new lib code yet, so the home page response is unchanged).
- No file imports `component-bus`; verified via `grep -rn "component-bus" src/`.
- No file references `lib/tabs/` or other Astro-only paths; verified via grep.

## Result

The Phase 3a foundation is in place: every framework-agnostic utility, store, type, and bundled JSON file from the Astro repo is ported and compiles clean against SolidStart 2.0-alpha + Solid 1.9.11 + Vite 7. Build-time constants (`__DATA_VERSION__`, `PUBLIC_*` env vars) are wired identically to the Astro repo, so port-source code referencing them keeps working.

Next: Phase 3b — port the home page (`CrystalBall`, `SearchBar`, `Header`) into `src/routes/index.tsx` + `src/components/solid/`. This is the first commit that will actually exercise the lib code we just landed; expect SSR-safety guards on `dom.ts` callers to land then.
