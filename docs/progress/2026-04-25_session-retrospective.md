# Session retrospective — 2026-04-25 EOD

**Date:** 2026-04-25 (single-day session)
**Scope:** From an empty `scoracle/scoracle-frontend` GitHub repo at session start to source-level parity with the Astro flagship at session end. Doc-only commit summarizing the day's 13 implementation commits and capturing pickup points for future sessions.

## Goal

Day started with an empty repo. The plan called for scaffolding (Phase 0/2) and the home page (Phase 3b) — getting through that would have been a productive day. Actual outcome: every phase through 3c shipped. Source-level parity with the Astro repo. Two end-of-phase audits confirm zero Astro residue.

## What Was Done — 13 commits, 6 phase milestones

### Foundation (Phase 0 / 2 / 3a + Terms)

| Commit | What |
|---|---|
| `9838b89` | Initial SolidStart 2.0-alpha.2 + Solid 1.9.11 + Vite 7 scaffold. ~280 ms dev boot. SSR end-to-end on `/`. |
| `381e997` | Phase 2 finish — CSP middleware ported, `/profile` + catch-all 404 routes, `solid-transition-group` smoke route at `/smoke-transition`. |
| `a33e891` | Phase 3a — every framework-agnostic asset ported (1 types file, 15 utils, 1 chart, 1 data, 5 stores, 6 JSON, fetch-data script, env.d.ts). Build-time wiring (`__DATA_VERSION__` define, `PUBLIC_` envPrefix). |
| `9a231b1` | Added `/terms` route stub for pre-launch authoring (Track A of Launch Plan). |

### Home page (Phase 3b)

| Commit | What |
|---|---|
| `26755ae` | Sport logos to `public/images/`; ported SearchBar (SSR fix: `Math.random` synonym init moved to `onMount`) + CrystalBall (consumed via `clientOnly`); wired `routes/index.tsx` with the SCORACLE editorial headline + central card composition. Network-aware idle-time `entityDataStore.preloadAll()` ported from the .astro inline script. |
| `091998e` | Header globally integrated via `app.tsx` Router root + `HeaderForRoute` location-aware wrapper. **Caught the SSR `onCleanup` issue:** Solid runs `onCleanup` on the server too at end-of-render; Header had no `isServer` guard → SSR crash with `ReferenceError: document is not defined`. Fixed with explicit guard. Also dropped `@jsxImportSource solid-js` directives from component files (1.x-era hint that conflicts with esbuild in 2.0-alpha). |
| `52ea0c9` | End-of-Phase-3b audit — confirmed zero Astro residue; remediated 4 stale doc-string references. |

### Profile page (Phase 3c — 8 commits, the heaviest phase)

| Commit | What |
|---|---|
| `ea854a3` | C1: TabContainer + content-tabs.css + EntityMeta foundation. |
| `6124ce0` | C2 (merged C2/C3 — NewsCard imports all 4 tab components): NewsCard + News, X, Co-mentions, **Vibes** tabs. VibesTab is 2026-04-24-new — displays the numeric 1–100 Gemma sentiment per the vibe-pivot. |
| `07f57a1` | C4: PizzaChart + StatsTab — largest single commit (~33 KB combined source). Dropped `createPizzaChartBridge()` (vanilla-JS adapter for the deactivated comparison feature; no remaining consumers). 5 PizzaChart UX improvements queued as additive follow-ups after a strategic decision to keep the custom SVG over swapping to a chart library. |
| `03f00d6` | C5 (merged C5/C6 — StatsCard imports CompareTab): StatsCard + TraitsTab + CompareTab. CompareTab is the new user-driven Compare flow that replaces the legacy SimilarityTab. |
| `504d057` | C7: Wired `routes/profile.tsx` with the real flip-card composition. **Translated the imperative ResizeObserver pattern from the Astro `<script>` into Solid signals + refs**, with the disconnect-during-flip semantics preserved. `entityType` from `useSearchParams` (SSR-safe); cards as `clientOnly`. `?view=stats` deep link works. |
| `f7c5e3d` | C8: End-of-Phase-3c audit — fully Solid-aligned. Defensive `isServer` guard added to EntityMeta's nested onCleanup for parity with the Header / route patterns. |

## Patterns codified during the build

### Three SSR patterns worth remembering

1. **`onCleanup` placement matters.** Top-level cleanup (sibling of `onMount`) fires on SSR teardown — needs explicit `if (isServer) return;` guard if it touches browser globals. Nested-in-`onMount` cleanup only registers on the client → safe by placement. Defensive guard is cheap insurance against future maintainers flipping the nesting.
2. **`clientOnly` is the right boundary for window-location-reading components.** EntityMeta, the news tabs, StatsTab, CompareTab — all read URL params at component setup. Wrap at the consumer with `clientOnly()` from `@solidjs/start` rather than refactoring verbatim ports to `useSearchParams`. The route reads `useSearchParams` for SSR-safe `entityType` discrimination; the cards read `window.location` internally; both agree.
3. **Drop `@jsxImportSource solid-js` directives** when porting from the Astro repo. SolidStart 2.0-alpha (vite-plugin-solid) handles JSX without the directive; keeping it triggers an esbuild "automatic JSX transform" warning.

### Per-commit progress doc convention

Established this session per user direction. Every commit on `scoracle` org repos lands a progress doc in two places:
- `<repo>/docs/progress/YYYY-MM-DD_short-desc.md` (in-repo, version-controlled)
- `~/scoracleWiki/Progress/<repo>/YYYY-MM-DD_short-desc.md` (vault mirror)

Solo project, no PR review gate, so progress docs replace the review-pause as the moment to capture *what just happened, and why*. Format mirrors the Astro repo's template (Goal / What Was Done / Files Changed / Verification / Result). After this commit: 14 progress docs in each location.

### Course corrections during the build

- **NewsCard has 4 tabs, not 3.** The Astro `CLAUDE.md` was stale. X tab was added 2026-04-19; VibesTab was added 2026-04-24 (Gemma sentiment pivot from blurbs to numeric 1–100 score per the 2026-04-22 vibe pipeline pivot).
- **Original C2/C3 and C5/C6 splits merged** because parent components imported children from the next planned commit. Combining was cleaner than stub-then-restore.
- **Dropped `createPizzaChartBridge()`** — the vanilla-JS mount adapter at the bottom of `PizzaChart.tsx` had only one consumer in the Astro repo: the deactivated `StatsComparisonContent.astro`. The new compare flow runs as a Solid component (`CompareTab`), so the bridge has no remaining users.
- **Kept custom PizzaChart over swapping to a chart library.** Strategic decision recorded in the C4 progress doc: "pizza chart" is a domain-specific sports-analytics pattern (StatsBomb / FBref); no mainstream library supports it natively. Switching means reimplementing on top of a 50–300 KB wrapper. Custom is right for our pillars (snappy + simplicity over cleverness).

## Pickup points for future sessions

### Immediate next: browser-side smoke

Pipeline-level verification (typecheck + SSR + curl) is complete. The visual / interaction layer needs a real browser session. Things to test:

1. **Home page (`/`)** — CrystalBall carousel auto-cycles every 3s; arrow buttons advance + pause for 30s; SearchBar autocomplete pulls from the bundled JSON.
2. **Header** — hamburger menu opens / closes; theme toggle persists to localStorage; home button navigates.
3. **Profile page** (`/profile?sport=NBA&type=player&id=237`) — meta card hydrates from local store; flip card animates between News and Stats faces; tabs lazy-load on first activation; `ResizeObserver` updates min-height when tab content loads.
4. **Tabs** — all 4 News-side (News, X, CoMentions, Vibes) and all 3 Stats-side (Stats, Traits, Compare) render; empty / error / loading states match Astro reference.
5. **CompareTab** — search a same-sport same-type entity; side-by-side pizza renders.
6. **Deep links** — `?view=stats` opens on stats face; back/forward navigation behaves; team variant (`?type=team`) renders correct conditional sections.

### Phase 4 — parity verification + DNS cutover

The plan refinement specified three pinned migration entities for parity testing. Pin them in `README.md` and run the same `?type=&sport=&id=` URL against both `~/Scoracle` (live Astro) and `~/scoracle-frontend` (new), compare visual output. Then DNS cutover with the Astro Worker as 72-hour hot standby per the plan.

Cloudflare Workers deployment adapter is also Phase 4 territory — SolidStart 2.0-alpha dropped the Nitro `cloudflare_module` preset along with Vinxi, so Workers deployment needs a Vite-based approach (`@cloudflare/vite-plugin` or manual build target).

### Tracked follow-ups (additive, not blocking)

1. **Image optimization** for sport logos. Currently raw PNGs in `/public/images/` totaling ~6.6 MB. Pre-launch: `vite-imagetools` or sharp.
2. **Dark-mode pre-paint script port** — inline `<script>` in `entry-server.tsx`'s `<head>` to fix the FOUC dark-mode users see on first paint.
3. **PizzaChart UX polish** — entry animation, hover/focus tooltips, ARIA labels, percentile-ring overlay, reduced-motion respect. 5-item list in the C4 progress doc.
4. **Cloudflare Workers deployment adapter** (above).
5. **Sport-store hydration micro-flicker** — only fix if user-visible.

## Bundle size budget — captured early

Astro `dist/client/_astro/` baseline at session start: **444 KB**. Budget for `scoracle-frontend` is **≤ 511 KB** (15% over). Production `vite build` not yet run against the full app — Phase 4 task once the Cloudflare adapter is in place.

## Files Changed

Added: `docs/progress/2026-04-25_session-retrospective.md` (this file).

This is a doc-only commit summarizing the day. No code changes.

## Result

`scoracle-frontend` source is feature-complete against the Astro repo. **13 implementation commits + this retrospective = 14 commits on `main`.** 14 progress docs (one per commit, mirrored to vault). Zero Astro residue. Two SSR patterns codified for future ports. Five additive follow-ups tracked. Ready to pick up with browser-side smoke or Phase 4 parity testing whenever the next session starts.

Curated highlight added to `wiki/Changelog.md`. `wiki/Architecture/Frontend Architecture.md` updated with a "Current state" section showing phase progression actually completed. Memory `project_frontend_greenfield.md` updated with end-of-day status and the codified SSR patterns.

Great day.
