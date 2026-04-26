# Port `albapepper/Scoracle@0cd4a10` — meta widget + pizza charts + compare tab redesign

**Date:** 2026-04-26
**Scope:** Mirror the Astro flagship's 2026-04-25 overhaul (`0cd4a10 feat: meta widget + pizza charts + compare tab redesign`) into `scoracle-frontend`. Brings sport-aware EntityMeta with a team-id logo fallback, a pizza-chart visual pass (~50% larger, full labels, no VS, percentile-tier comparison overlay), a full CompareTab rewrite around a new extracted `CompareSearch` component, and an api-fetcher cache bug fix that was silently breaking stats reloads.

## Goal

After the first browser smoke landed (`scoracle-frontend@4fd7fa1`), two visual gaps surfaced: the EntityMeta and content cards weren't differentiated from the page background (the `.card` utility class never got ported in Phase 3a), and the Pistons team profile rendered with no logo above the name. Both were addressed by the Astro 2026-04-25 commit, plus a stack of related visual + cache improvements that all landed in the same Astro changeset. Port the whole thing rather than cherry-picking — keeps the two repos at functional parity through DNS cutover.

## What Was Done

### Card surface utility class (`src/global.css`)

Phase 3a ported tokens but skipped the utility classes from Astro's `src/styles/global.css`. Added `.card` (background + border + radius), `.eyebrow` (uppercase metadata label), and the `touch-action: manipulation` rule. EntityMeta uses `class="meta-widget card"` and TabContainer wraps NewsCard/StatsCard in `class="tab-card card"`, so adding the `.card` rule fixes all three surfaces at once. **This is the entire fix for the "cards blend into background" symptom.**

### EntityMeta — sport-aware details + team-logo fallback (`src/components/solid/EntityMeta.tsx`, `EntityMeta.css`)

- `resolvePlayer` falls back to the team logo via `entityDataStore.getTeamMetaSync(sport, String(meta.team.id))` when no `photo_url` is on the player record. NBA + NFL ship no `photo_url` upstream, so this is the primary avatar path for those sports.
- `buildPlayerDetails` rewritten in sport-natural order; sport-shaped data drives sport-tailored output without explicit branching (NBA fills draft pedigree, NFL fills age + experience, Football fills DOB-derived age + nationality).
- New `formatDraft(year, round, pick)` helper composes "2014 · R1 · #4".
- Age uses NFL's direct `meta.age` first, then DOB-derived age (Football). Country prefers `birth_country`, then `nationality`. Experience surfaces NFL's BDL string ("rookie", "8 years", etc.).
- Detail rows: CSS grid → centered flexbox (`flex: 0 1 92px`, `justify-content: center`). Orphans in a partial last row now center instead of left-aligning. Three responsive `grid-template-columns` overrides removed.

### PlayerMeta type (`src/lib/types/index.ts`)

Added `draft_round?: number`, `draft_pick?: number`, `age?: number`, `experience?: string`. Mirror the backend `/meta` payload shape.

### `fetch-autofill.mjs` — surface meta fields, drop team-logo denormalization

- Removed `team.logo_url` denormalization on player records (widget resolves it itself by `team_id` now).
- Added `college`, `draft_year`, `draft_round`, `draft_pick`, `age` (numeric only), `experience` to the player payload.
- Re-ran `npm run fetch-data` against the prod tunnel: NBA 30/30, NFL 32/32, Football 96/96 teams have `logo_url`. Player draft + experience fields populated where the backend has them.

### Pizza chart visual pass (`src/components/solid/PizzaChart.tsx`, `src/lib/charts/arc-math.ts`)

- Removed `truncateLabel(..., 14)` calls from both single + comparison charts; labels render in full.
- `overflow: visible` on both SVGs so labels can extend past the viewBox without clipping.
- Default `innerRadius` 22 → 14 (smaller donut hole, more pizza).
- Charts ~50% larger: `width=500, height=500, outerRadius=162, labelOffset=32` (StatsTab + CompareTab consumers updated). `.stats-pizza-chart` `max-width: 320 → 500` with proportional adjustments at 480px (300→460) and 320px (260→380) breakpoints.
- Dropped the "VS" center label from the comparison chart.
- `truncateLabel` removed from `arc-math.ts`. New `describeArcOnly(...)` helper renders an open curved-arc segment (no inner edge, not closed) — used for the new "marker line" overlay below.

### Comparison overlay redesign (`PizzaChart.tsx`)

- Comparison primary slices now use `percentileTierVar(percentile)` — same per-tier palette as solo Stats — instead of an entity-specific brand color.
- Comparison entity overlay branches by relative percentile:
  - `compare > primary`: solid light-gray annulus from primary's outer edge out to compare's outer radius (fill-opacity 0.28, subtle stroke).
  - `compare < primary`: dashed open arc at the compare radius (`stroke-dasharray="4,3"`, rounded caps), cutting through the primary slice.
  - `compare === primary`: nothing rendered.
  - No primary baseline (compare-only stat): hollow outline at compare radius.
- Comparison label values: primary in `var(--text)`, secondary in `var(--text-tertiary)`.

### Removed obsolete entity-color modules

- Deleted `src/lib/utils/entity-colors.ts` and `src/lib/data/team-colors.ts` (and the now-empty `src/lib/data/` directory). Sole consumer was the old CompareTab; the new design uses the percentile-tier palette.
- Note: the legacy CompareTab in our repo had a *broken import* of `resolveComparisonPalette` from `entity-colors` that would have crashed at runtime if the tab activated. The Phase 3a "every framework-agnostic asset ported" line was technically correct (entity-colors *was* ported) but the file was dead code. CompareTab rewrite removes both the import and the module.

### `api-fetcher.ts` 304-without-cache bug fix

ETags were persisted in `localStorage` but response bodies were not. After page reload, `If-None-Match` was sent against a now-empty in-memory cache; the server returned 304 + empty body, the 304 handler fell through, `response.json()` threw on the empty body, and the resource silently errored — leaving the Stats tab stuck on the loading skeleton.

- Removed `loadEtags` / `saveEtag` / `getStoredEtag` / `ETAG_STORAGE_KEY`. ETags now live only in the in-memory cache entry that holds the data they describe.
- Added a defensive 304-without-cache retry: drops `If-None-Match` and re-fetches fresh if the unexpected case ever occurs.

### CompareTab — full rewrite + extracted CompareSearch

New reusable `src/components/solid/CompareSearch.tsx` + `.css`:
- Search input with autocomplete suggestions, scoped to same-sport same-type entities (excluding the primary).
- Selected state renders a "vs **Name** ×" pill.
- Keyboard nav (ArrowUp/Down/Enter/Escape), MouseDown selection, blur-with-delay so suggestion clicks register.

`CompareTab.tsx` rebuilt:
- Charts always render once primary stats load (no longer "search first, then see charts").
- `CompareSearch` lives at the top, charts use the same 4-slot grid as `StatsTab`, rate toggle (Per Game / Per-90) carries through.
- Picking an entity overlays its values on the existing charts; clearing reverts. `mutateCompare(null)` on clear gates against `createResource` keeping its last value indefinitely (the lingering-overlay bug).
- Slide-in animation on the search bar (`max-height` 0 → 120px, opacity 0 → 1, 320 ms cubic-bezier). `overflow: hidden` only applied via a transient `.animating` class while the slide-in runs (~360 ms), then dropped so the autocomplete dropdown can render over the charts. Respects `prefers-reduced-motion`.

`CompareTab.css` slimmed to just the slide-in animation; the rest moved to `CompareSearch.css`.

### Consumer prop name update (`StatsCard.tsx`)

New CompareTab takes `type` (matching Astro's StatsCard); old took `entityType`. One-line update.

### Meta JSON regen

Re-ran `npm run fetch-data` after the `fetch-autofill.mjs` change to populate the new player meta fields. Net file size delta: NBA-meta +45 KB, NFL-meta +89 KB; Football-meta unchanged (no new fields apply at the source).

## Files Changed

**Added**
- `src/components/solid/CompareSearch.tsx`
- `src/components/solid/CompareSearch.css`
- `docs/progress/2026-04-26_port-0cd4a10-meta-pizza-compare.md`

**Modified**
- `src/global.css` — `.card` / `.eyebrow` / `touch-action`
- `src/lib/types/index.ts` — PlayerMeta `draft_round` / `draft_pick` / `age` / `experience`
- `src/components/solid/EntityMeta.tsx` — `formatDraft`, sport-natural details, team-logo fallback
- `src/components/solid/EntityMeta.css` — flex layout for `.pw-details`, responsive overrides
- `src/components/solid/PizzaChart.tsx` — visual pass + comparison overlay redesign
- `src/lib/charts/arc-math.ts` — `truncateLabel` → `describeArcOnly`
- `src/components/solid/StatsTab.tsx` — PizzaChart options 500×500 / outerRadius 162 / labelOffset 32
- `src/components/solid/StatsTab.css` — `.stats-pizza-chart` max-width breakpoints
- `src/components/solid/StatsCard.tsx` — CompareTab prop name `entityType` → `type`
- `src/components/solid/CompareTab.tsx` — full rewrite
- `src/components/solid/CompareTab.css` — slimmed to slide-in animation
- `src/lib/utils/api-fetcher.ts` — drop localStorage ETag persistence + 304-without-cache retry
- `scripts/fetch-autofill.mjs` — drop team-logo denormalization, surface new player meta fields
- `public/data/{nba,nfl,football}.json` (regenerated)
- `public/data/{nba,nfl,football}-meta.json` (regenerated)

**Deleted**
- `src/lib/utils/entity-colors.ts`
- `src/lib/data/team-colors.ts` (and the now-empty `src/lib/data/` directory)

## Verification

- `npm run typecheck` — green throughout the port (one mid-port slip caught: StatsCard CompareTab prop name needed updating from `entityType` to `type`).
- `npm run fetch-data` — pulled fresh `/meta` payloads (NBA 859, NFL 3184, Football 3437 entities). Spot-checked Pistons team meta has `logo_url`. Spot-checked NBA player records have `draft_year` / `draft_round` / `draft_pick`. NFL has `age` and `experience` strings.
- `curl http://localhost:5185/profile?sport=NBA&type=team&id=9` — HTTP 200, 20 KB shell with header + `profile-main` + `card-flip-container` intact.
- Browser-side smoke (live, not just curl):
  - EntityMeta surface: card border + bg-card distinct from page bg.
  - Pistons team profile: logo renders above the name.
  - NewsCard / StatsCard: card surfaces match.
  - Player profile (NBA): team logo appears as avatar (no upstream `photo_url`).
  - Pizza charts: ~50% larger, full labels (no truncation), no VS in comparison center.
  - StatsTab + CompareTab pizza chart sizes match (500×500 with same `outerRadius`/`labelOffset`).
  - CompareTab opens directly to primary entity charts with search bar sliding in above.

## Result

`scoracle-frontend` is back at source-level parity with the Astro flagship (`albapepper/Scoracle@0cd4a10`). Both visual symptoms from the user's first round of browser testing — undifferentiated cards and missing team logos — are fixed, plus the comparison flow gets the new "charts always present, overlay on select" UX without a separate gate. The 304 cache bug that was silently breaking stats reloads is gone. The `entity-colors` / `team-colors` modules retire — they were dead code in the new repo (sole consumer was the legacy CompareTab whose `resolveComparisonPalette` import would have thrown at runtime if the tab ever activated).

15 commits on `main` total: 13 from the 2026-04-25 single-day build-out + `4fd7fa1` (dev proxy + ErrorBoundary, 2026-04-26) + this commit.

## Next

Per the unified Launch Plan, the path forward is Phase 4: Cloudflare Workers deployment adapter (long pole — SolidStart 2.0-alpha dropped the `cloudflare_module` Nitro preset along with Vinxi, so Workers deployment needs a Vite-based approach), bundle size measurement against the ≤511 KB budget, then parity testing against live Astro on pinned entities, then DNS cutover. Smaller wins to slot in: dark-mode pre-paint script port (Phase 3b audit follow-up — kills the FOUC for dark-theme users) and image optimization on the ~6.6 MB sport logos (Lighthouse 90+ is launch-blocking per the Launch Plan).
