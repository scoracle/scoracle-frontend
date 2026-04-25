# Phase 3c, Commit 5 — StatsCard + TraitsTab + CompareTab

**Date:** 2026-04-25
**Scope:** Card-back composition. Same coupling pattern as C2 — StatsCard imports CompareTab, so the original C5/C6 split couldn't hold; merged into one commit. The flagged audit task (C8) numbering rolls; C5 here covers what was C5+C6 in the original plan.

## Goal

Ship the back of the flip card. After this commit, all 13 Phase 3c components are in tree and the only Phase 3c work remaining is wiring `routes/profile.tsx` (C7) and the end-of-phase audit (C8).

## What Was Done

### `StatsCard.tsx`
Verbatim 27-line port. Composes `TabContainer` with three tabs (Stats / Traits / Compare). Each tab content factory passes the reactive `isActive` accessor through. Default tab is `stats`.

### `TraitsTab.tsx` + `.css`
Verbatim port. Consumes `pageData('stats')` via `waitForPageData('stats', 5000)` — the data is published by `StatsTab` when its fetch resolves, so TraitsTab is a downstream consumer of StatsTab's resource. No URL-param reads → no clientOnly requirement of its own (but it's inside StatsCard which is inside profile route, so it lands inside the route's clientOnly wrap anyway).

Logic is small but tasteful: percentile thresholds map to indicator strings (`+++`, `++`, `+` for strengths at 70/80/90+; `---`, `--`, `-` for weaknesses at ≤30/20/10). Strengths sort by `percentile DESC`, weaknesses by `percentile ASC`. Empty-state copy distinguishes "no notable strengths" from a fetch error.

### `CompareTab.tsx` + `.css`
The most substantive port in this commit. 420-line component implementing the new user-driven Compare flow that **replaces SimilarityTab** (per the plan refinement).

What it does:
1. Reads URL params at setup → clientOnly wrap requirement.
2. Pulls candidate entities from `entityDataStore.getEntities(sport)`, scoped to the same sport + same entity type, excluding the primary (you can't compare a player to themselves).
3. Fuzzy-search input over the candidate set (8 max suggestions, 2-char min query). Same input UX as `SearchBar` (arrow keys + Enter, blur delay so click registers).
4. On selection: fetches stats for the compare entity via `entityUrl(sport, type, id)` + `swrFetch` with `CACHE_PRESETS.stats`. The primary entity's stats are already cached from StatsTab's fetch — request dedup via `swrFetch` returns the cached entity payload instantly.
5. Renders a 2x2 grid (same Attack / Possession / Defense / Discipline slots) with PizzaChart's `comparison` mode — primary as filled, secondary as outlined dashed overlay.
6. Player-only rate toggle (Per Game / Per-N) when the primary has rate data.
7. Resolves brand-aware comparison palette via `resolveComparisonPalette` from `entity-colors`, applied via inline CSS variables (`--compare-primary`, `--compare-secondary`) so the chart inherits the right colors per matchup.

Imports `entityUrl` from `data-sources` — different from `statsUrl` (StatsTab uses statsUrl which appears to be an alias forwarding to entityUrl with the same semantics; both ported in Phase 3a, kept as separate exports per the Astro source).

## Files Changed

Added (5):
- `src/components/solid/StatsCard.tsx`
- `src/components/solid/TraitsTab.tsx`, `TraitsTab.css`
- `src/components/solid/CompareTab.tsx`, `CompareTab.css`

Plus `docs/progress/2026-04-25_phase-3c-c5-statscard.md` (this file).

## Verification

- Pre-port: `entityUrl`, `unwrapEntityPayload`, `resolveComparisonPalette` confirmed in our lib (entity-colors.ts is zero-diff verbatim from Astro).
- `npm run typecheck` → clean.
- `vite dev` → boots in ~250 ms.
- All four existing routes still serve unchanged (no route consumes these yet).
- `src/components/solid/` now has 25 files (the full Phase 3c component set is in tree).

## Result

All 13 Phase 3c components ported. Two commits remain:

- **C7** — wire `routes/profile.tsx`: parse `?type=&sport=&id=` URL params, conditionally render player vs team variant, integrate the front/back flip card (NewsCard front, StatsCard back), bridge `profile:viewchange` / `profile:setview` events from EntityMeta to the flip controller. Will use `clientOnly` from `@solidjs/start` since several components read `window.location` at setup.
- **C8** — end-of-Phase 3c audit: re-run the 9-pass Astro residue scan, fresh SSR-safety pass on the new components, catalog and remediate any stale doc-string references.
