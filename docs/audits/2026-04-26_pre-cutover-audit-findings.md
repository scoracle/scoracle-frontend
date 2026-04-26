# Pre-cutover audit findings

**Date:** 2026-04-26
**Auditor:** fresh session (Opus 4.7), per the audit brief at `docs/progress/2026-04-26_pre-cutover-audit-brief.md`
**Read before:** `CLAUDE.md`, `~/scoracleWiki/wiki/Architecture/Frontend Architecture.md`, the seven flagged areas in the brief
**Code reviewed:** `src/routes/`, `src/components/solid/`, `src/lib/utils/`, `src/stores/`, `src/middleware.ts`, `src/app.tsx`, `src/entry-server.tsx`, `worker.ts`, `vite.config.ts`, `package.json`

## Summary

Overall health is good. The port is functionally clean, the SSR posture is honest (the codified `clientOnly` rules work), bundle size is well under budget, and there are no cutover-blocking bugs. **No Critical findings.** The site is safe to flip.

Top three opportunities, in order of impact:

1. **The profile route loses real SSR for no payoff.** All three above-the-fold cards (`EntityMeta`, `NewsCard`, `StatsCard`) are wrapped in `clientOnly()` because their leaf descendants read `window.location.search` at component setup. Threading entity params via context (or props) from the route — which already calls `useSearchParams` — would let the SSR shell render card chrome + skeletons, with data fetches still happening client-side. **High / Snappy.**
2. **Both flip-card faces eagerly fetch their default tab on every load.** NewsTab and StatsTab both fire their API calls on profile mount, even though only one card face is visible — a direct violation of design pillar #3 (lazy-load). One stats fetch per profile page that the user often never sees. **High / Snappy.**
3. **The codebase carries two parallel cross-island state mechanisms** — three nanostores (`$newsArticles`, `$statsData`, `$tweets`) and a callback-queued `pageDataStore` (`waitForPageData`, `getPageData`, `setPageData`). They're publishing the same data twice. The nanostores are the idiomatic Solid primitive and are already wired; the `pageDataStore` is Astro-era plumbing that should retire. **High / Simple.**

Recommended order of operations: (a) purge confirmed dead code (S, no behavior change); (b) fix the lazy-load leak and the anchor-onClick navigation regression (S each, observable wins); (c) collapse the `shouldLoad` ladder + replace `pageDataStore` with the existing nanostores (M, kills duplication); (d) the bigger refactor — entity-params via context + drop `clientOnly` wrappers (L, restores SSR). The bigger refactor doesn't need to block cutover; it's a week-1 follow-up.

---

## Findings

### 1. Restore SSR for the profile shell by threading entity params via context

**Severity:** High
**Effort:** L
**Aligns with:** Snappy / Both

The profile route at `src/routes/profile.tsx:51-53` wraps `EntityMeta`, `NewsCard`, and `StatsCard` in `clientOnly()`. The codified rationale (in the route header comment and the architecture wiki) is that `EntityMeta`, `NewsTab` (`src/components/solid/NewsTab.tsx:21`), `CompareTab` (`CompareTab.tsx:114`), `StatsTab` (`StatsTab.tsx:152` via `parseEntityParams()`), `XTab`, `VibesTab`, `CoMentionsTab` all read `window.location.search` directly at component setup.

This means the SSR HTML for `/profile` is essentially empty — the server can't render even the card chrome, skeletons, or EntityMeta scaffolding. Every above-the-fold pixel waits on JS hydration. For the four-page surface where `/profile` is one of three high-traffic routes, that's a real first-paint cost.

The route already calls `useSearchParams` (`profile.tsx:56`) for the `entityType` discriminator, and that's SSR-safe. The fix is to take the same params there once and propagate them downward — Solid's `createContext` + `useContext` is the natural primitive (one provider at the route, every descendant reads `useContext` instead of touching `window`). Alternative: thread as props through `EntityMeta`/`NewsCard`/`StatsCard` and into each tab; uglier but no new abstraction.

**What we lose by skipping:** TTFB-to-paint stays at the cost of two JS bundle waterfalls (`clientOnly` is a code-split + dynamic import). With the architecture wiki's per-route prerender ambition (deferred until Nitro v3), this matters more later.

**Counter-argument worth noting:** The prior session calls this "the path of least resistance, not the best path" and is right. The refactor touches every tab. A ports-faithful audit would say "leave it." This is the opposite recommendation precisely because the audit lens is *how does it look in pure-Solid hindsight* — and threading params via context is what a from-scratch Solid app would do.

### 2. Stop fetching the hidden card's default tab

**Severity:** High
**Effort:** S
**Aligns with:** Snappy

`profile.tsx:174-184` mounts both `NewsCard` and `StatsCard` simultaneously (front + back of the flip card). Each card mounts a `TabContainer` with a `defaultTab` (`NewsCard.tsx:21`: `defaultTab="news"`; `StatsCard.tsx:25`: `defaultTab="stats"`). `TabContainer` (`TabContainer.tsx:26`) initializes its `activeTab` signal to `defaultTab` immediately, which means `props.active = true` for both NewsTab and StatsTab on initial mount — they both fire their fetches.

This violates design pillar #3 (lazy-load). Concretely: a user who lands on `/profile?...` (default view = news) and never flips to stats still triggers a `GET /api/v1/{sport}/{type}/{id}` stats request. Same in reverse if they deep-link to `?view=stats` and never flip back.

**Proposed change:** `TabContainer` exposes a `cardActive` accessor prop (default `() => true`); `NewsCard`/`StatsCard` accept `cardActive` from the route and forward it; tab content factories receive `isActive` that's `cardActive() && activeTab() === tab.id`. The route passes `() => view() === 'news'` to `NewsCard` and `() => view() === 'stats'` to `StatsCard`. Now only the visible card's active tab gates `props.active = true`.

**What we lose by skipping:** Roughly one wasted backend call per profile page-view, and the moral debt of the lazy-load principle being false-in-fact.

### 3. Replace `pageDataStore` callback queue with the existing nanostores

**Severity:** High
**Effort:** M
**Aligns with:** Simple

`api-fetcher.ts:217-296` defines a parallel state mechanism: `pageDataStore` (a `PageData` object) plus a `pageDataCallbacks` Map and three exported functions (`setPageData`, `getPageData`, `waitForPageData`). It's used in exactly two consumer sites:

- `TraitsTab.tsx:91` — `await waitForPageData('stats', 5000)`
- `CoMentionsTab.tsx:46-47` — `waitForPageData('news', 3000)` + `getPageData('tweets')`

…and three publisher sites: `StatsTab.tsx:282`, `NewsTab.tsx:48`, `XTab.tsx:92`. Each of those publishers *also* publishes to a nanostore (`$statsData`, `$newsArticles`, `$tweets`) — note the explicit "Also publishes to the legacy `setPageData('stats')` for unconverted consumers" comment at `src/stores/stats.ts:7` and `src/stores/news.ts:5`. The nanostore version was always meant to win.

**Proposed change:** In `TraitsTab` and `CoMentionsTab`, replace the `await waitForPageData(...)` calls with `useStore($statsData)` / `useStore($newsArticles)` / `useStore($tweets)` and a `createMemo` that derives the trait/co-mention shape. Drop the `setPageData(...)` calls from `NewsTab`/`StatsTab`/`XTab`. Then delete `pageDataStore`, `pageDataCallbacks`, `setPageData`, `getPageData`, `waitForPageData`, `clearPageData`, the `PageData` interface, and the legacy-comment lines in `src/stores/`.

**Wins beyond simplicity:** The nanostore version is *live*. Today, when SWR revalidates StatsTab's data 30 minutes later, TraitsTab's already-rendered list is stale because `waitForPageData` resolved once. With `useStore($statsData)` + a memo, traits re-derive automatically.

**Risk:** Need to verify the activation order — if a user opens Traits before Stats has ever rendered active, the nanostore is empty (`null`). Today this fails the same way (`waitForPageData` times out). If finding #2 is implemented (cardActive gating), the same flow applies.

### 4. Replace the `'profile:viewchange'` CustomEvent bridge with a nanostore

**Severity:** Medium
**Effort:** S
**Aligns with:** Both

Suspicious area #1. `EntityMeta.tsx:228` dispatches `window.dispatchEvent(new CustomEvent('profile:viewchange', ...))` on toggle click; `profile.tsx:152-156` listens for the same event to drive the flip. This is the verbatim Astro vanilla-JS bridge.

**Proposed change:** Two acceptable options.
1. **Nanostore.** New `src/stores/view.ts` exporting `$profileView = atom<'news'|'stats'>('news')`. EntityMeta's toggle calls `$profileView.set(view)`; profile.tsx subscribes via `useStore($profileView)` and runs the existing flip logic in a `createEffect`. Symmetric with the rest of `src/stores/`.
2. **Callback prop.** Cleaner still: pass `onViewChange: (v: 'news'|'stats') => void` from `profile.tsx` down to `EntityMeta` as a prop. EntityMeta becomes a controlled component for the toggle. Avoids global state for a parent-child concern.

Option 2 is more Solid-idiomatic (no global state for a single-page concern) but requires the param-threading from finding #1 to make EntityMeta cleanly accept props. Option 1 is the safer drop-in.

While doing this, **also delete** the `'profile:setview'` listener at `EntityMeta.tsx:235-247` — `grep` confirms no code in the new repo dispatches that event. Pure dead code from the Astro deep-link path that was never reconnected.

### 5. Imperative `ResizeObserver` in `profile.tsx` is overengineered

**Severity:** Medium
**Effort:** S
**Aligns with:** Both

Suspicious area #2. `profile.tsx:92-163` is ~50 lines of imperative ResizeObserver management. The defensive `observer.disconnect()` during the flip animation (`profile.tsx:126`) is theatre: the flip is a `transform: rotateY(...)` on the parent, and CSS transforms do not change `scrollHeight` of children. There's nothing to thrash.

**Proposed change:** Single ResizeObserver, never disconnected during the flip. A `createEffect` watching `view()` updates the container `min-height` to the active face's `scrollHeight` whenever the toggle fires. The ResizeObserver only fires when the underlying *content* (e.g., NewsTab article list arrives) changes height. Both paths converge on the same `updateHeight()` helper. Drop the `setIsFlipping`/`onTransitionEnd`/700ms-fallback dance entirely. Result: ~15 lines, fewer signals, no observer-toggle state.

**Risk:** Worth confirming on a slow connection that an in-flight load completing mid-animation doesn't cause a visible jump. If it does, the simplest mitigation is suppressing the writes during the flip via a `flipping` boolean — but probably not needed, because content height changes during flip are rare and the existing ResizeObserver dance doesn't actually prevent them either (the safety fallback just reconnects after 700ms anyway).

### 6. Collapse the `shouldLoad` ladder via `createMemo`

**Severity:** Medium
**Effort:** S
**Aligns with:** Both

Every tab repeats the same 4-line block (verified at `NewsTab.tsx:26-32`, `XTab.tsx:59-64`, `CoMentionsTab.tsx:34-39`, `VibesTab.tsx:123-129`, `StatsTab.tsx:162-167`, `CompareTab.tsx:121-125`, `TraitsTab.tsx:81-87`):

> `const isActive = () => props.active(); const [shouldLoad, setShouldLoad] = createSignal(false); createEffect(() => { if (isActive() && !shouldLoad()) setShouldLoad(true); });`

…then `createResource(shouldLoad, fetcher)`. The intent is "latch to true on first activation, never go back." The idiomatic Solid one-liner is a memo that carries its previous value: `createMemo<boolean>(prev => prev || props.active(), false)`. Same semantics, no signal-set-from-effect anti-pattern.

**Why not just** `createResource(props.active, fetcher)`: because `props.active` toggles with tab clicks, and `createResource` re-runs the fetcher on every truthy→truthy *change* of the source key. The latch is needed to give the resource a stable source key once "loaded once."

**Proposed change:** Per-component reduction of 5 lines → 2 lines, ×7 sites. Or hoist to a shared `useTabResource(active, fetcher)` helper in `lib/utils/` — but per `CLAUDE.md` ("three similar lines is better than a premature abstraction"), seven near-identical 2-line uses are still under the bar. Inline the memo and move on.

**Bonus cleanup:** Several fetchers also start with `if (!shouldLoad()) return null;` (e.g., `StatsTab.tsx:172`, `NewsTab.tsx:35`, `XTab.tsx:67`, `VibesTab.tsx:140`, `CoMentionsTab.tsx:42`). With `createResource`'s falsy-source semantics, the fetcher only runs when the source is truthy, so this guard is dead.

### 7. Fix the anchor `onClick` navigation regression in `Header.tsx`

**Severity:** Medium
**Effort:** S
**Aligns with:** Both

`Header.tsx:104` and `Header.tsx:181` render `<a href="/">` and `<a href="/">` (Home links) but attach `onClick={() => { window.location.href = '/'; }}` to each. The anchor already navigates natively. The onClick:

- runs the JS handler in addition to the native nav (one hard reload),
- breaks Ctrl-click / middle-click ("open in new tab") because `window.location.href` always navigates the current tab regardless of modifiers,
- breaks "copy link address" if any user code ever calls `e.preventDefault()` upstream.

This is a verbatim port from the Astro repo, where the comment in `~/Scoracle/CLAUDE.md` ("In `client:only` Solid islands, `navigate()` from `astro:transitions/client` does not work reliably… Use `window.location.href = '/path'`") justified imperative navigation in island code. That justification doesn't apply here — `<a href>` is a real anchor, not a `navigate()` call, and `@solidjs/router` provides `useNavigate()` for the cases that genuinely need programmatic nav.

**Proposed change:** Drop the onClick handlers entirely. The anchors handle navigation. (Optional follow-up: replace the `<a>` with `<A>` from `@solidjs/router` so the home nav uses the SPA router instead of a hard reload — but that's a separate enhancement.)

### 8. `CompareSearch` lacks the diacritic normalization that `SearchBar` has

**Severity:** Medium
**Effort:** S
**Aligns with:** Snappy (consistency)

`SearchBar.tsx:84-102` uses `normalizeForSearch` plus a precomputed `_searchIndex` on each entity, so "estevao" matches "Estêvão". `CompareSearch.tsx:60-72` uses `name.toLowerCase().includes(q)` — no diacritic folding, no precomputed index, no team aliases. Same UX surface, divergent behavior: a user who searches "Estêvão" via the main bar but "estevao" via Compare gets different results.

**Proposed change:** Reuse `normalizeForSearch` and the `_searchIndex` field already populated in `entityDataStore.fetchEntities` (`entity-data-store.ts:155-156`). Two-line change to `CompareSearch.tsx`.

**Note:** The two filter loops (SearchBar lines 84-102, CompareSearch lines 60-72) are now duplicated logic. *Don't* abstract yet — at two callsites this is below the abstraction threshold. Flag as a candidate to revisit if a third compare/search bar appears (e.g., when `scoracle-sandbox` lands).

### 9. `CompareSearch` runs `getEntities` twice on mount

**Severity:** Low
**Effort:** S
**Aligns with:** Simple

`CompareSearch.tsx:44-48` (`onMount`) and `CompareSearch.tsx:51-58` (`createEffect`) both load the same candidate pool. The effect already runs once at component setup with the initial prop values, so the `onMount` block is duplicate work — two parallel `entityDataStore.getEntities(...)` calls (deduplicated by the store's `loadPromises` map, so it's not a double-fetch, but still a redundant code path).

**Proposed change:** Delete the `onMount` block (lines 44-48). The effect handles initial + reactive updates.

### 10. Confirmed dead code — purge before cutover

**Severity:** Low
**Effort:** S
**Aligns with:** Simple

Confirmed via `grep -rn` across `src/`:

- **`src/lib/utils/autocomplete.ts`** — entire file. Zero importers. Astro-era class.
- **`src/lib/utils/dom.ts:14-19` (`escapeHtml`)** — only consumer is the dead `autocomplete.ts`. Solid's JSX auto-escapes. Delete with autocomplete.ts.
- **`src/lib/utils/dom.ts:50-66` (`showState`)** — zero consumers. Astro-era imperative DOM.
- **`src/lib/utils/dom.ts:79-88` (`showWidgetState`)** — zero consumers. Same.
- **`src/lib/utils/data-sources.ts:62-64` (`profileUrl`)** — zero consumers; alias for `entityUrl`.
- **`src/lib/utils/data-sources.ts:104-113` (`twitterSportFeedUrl`)** — zero consumers.
- **`src/lib/utils/data-sources.ts:123-132` (`vibeHistoryUrl`)** — zero consumers.
- **`src/lib/utils/api-fetcher.ts:312-331` (`fetchTwitterStatus` + `TwitterStatus` exports)** — zero importers; `XTab` calls `swrFetch(twitterStatusUrl().url)` directly.
- **`EntityMeta.tsx:215-220` `setPageData('widget', ...)`** — zero consumers. The XTab refers to its own local `profileUrl` variable, not the `widget` page-data key. Drop the call (the entity nanostore covers it if anyone ever needs it).
- **`EntityMeta.tsx:235-247` (`profile:setview` listener)** — zero dispatchers.
- **`src/routes/smoke-transition.tsx`** — Phase-2 verification artifact. The file's own header says "Delete once the transition is exercised in production traffic." Production traffic exists at `https://scoracle-frontend.albapepper.workers.dev`. Delete it; it's a route shipped to users today.

**Estimate:** ~150 LOC removed, no behavior change, no tests required (all unused).

### 11. `statsUrl` is a one-liner alias for `entityUrl`; consider collapsing

**Severity:** Low
**Effort:** S
**Aligns with:** Simple

`data-sources.ts:69-71` defines `statsUrl(sport, type, id)` as `return entityUrl(sport, type, id)`. It's used at `StatsTab.tsx:15,173`. Two options:

- Inline `entityUrl` at the StatsTab callsite (one fewer indirection).
- Keep the alias (gives the caller a vocabulary, "I'm fetching stats" vs "I'm fetching the entity"). At one consumer this is barely worth the alias.

Pick one and move on. Defaults to inline given the "three similar lines beats abstraction" rule.

### 12. Add a minimum-viable test surface for pure data utilities

**Severity:** Medium
**Effort:** M
**Aligns with:** Both (robustness for cutover)

Suspicious area #6. There are zero tests. The highest-leverage surface is the deterministic, data-shape-sensitive utilities — these are the things that silently break when the backend changes a field name and you find out via a blank tab in production:

- `src/lib/utils/stats-categorizer.ts` — categorization is non-trivial, sport-specific, and per-stat.
- `src/lib/utils/co-mentions.ts` — entity-matching against article titles, easy to false-positive.
- `src/lib/utils/position-groups.ts` — sport-specific position normalization.
- `src/lib/utils/player-metrics.ts` — height/weight formatting, easy to subtly break locale.
- `src/lib/utils/search-normalize.ts` — diacritic folding, regression risk on a cosmetic change.

**Proposed harness:** `vitest` (Vite-native, zero-config), one fixture per sport per util, ~50 cases total. No DOM, no Solid runtime needed — these are pure functions. Skip component tests for now; they're a different cost class. Skip API integration tests entirely; the Go backend's tests cover that side.

**What we lose by skipping:** The Vibe-blurb random selection, the home/away-defs map, the categorizer's silent skipping of unknown stat keys — every one of these is a place where a backend change ships to prod and the tab quietly empties. Without tests, the smoke-test feedback loop is "user opens browser." That's slow and embarrassing.

**Counter-argument:** Adding a test framework grows the dependency footprint. Vitest is small, well-scoped, in the Vite family the project already uses; it's probably under the bar. Note the brief's instruction: "Don't propose… a testing framework you haven't first justified the need for." Justification: data-utility regressions are silent and the only repro path today is a real user on a real entity.

### 13. Module-singleton SWR cache will leak across SSR requests if anyone ever moves a fetch server-side

**Severity:** Low (today) / Critical-if-moved
**Effort:** S
**Aligns with:** Snappy / Simple

`api-fetcher.ts:40-43` defines `cache` and `inFlight` at module scope. On Cloudflare Workers, modules persist across requests within an isolate. Today this is safe because every `swrFetch` call is downstream of a `clientOnly` boundary — fetches happen in the browser, where module scope is per-tab.

If the param-threading refactor (finding #1) succeeds and any fetch later moves into a server-side `createResource` (e.g., to SSR the EntityMeta header), this cache silently shares response bodies across users. For Scoracle's data (public sports stats), the privacy blast radius is low — but the staleness blast radius isn't (one user's cache miss serves the next user a 30-minute-old payload, including any error responses).

**Proposed change:** Add a one-line guard at module top: `if (!isServer) ... ` around the cache definition, OR document explicitly that `swrFetch` is client-only. Easier path: leave the code, add a single header comment "Client-only — module-singleton cache. Don't import from server entry points or per-request loaders."

**Why this matters at all:** It's the kind of footgun where the code keeps working until it doesn't, and the failure mode (one user sees another's data) is the kind of thing that makes a launch blog post.

### 14. `normalizePercentiles` is duplicated verbatim in StatsTab and CompareTab

**Severity:** Low
**Effort:** S
**Aligns with:** Simple

`StatsTab.tsx:54-68` and `CompareTab.tsx:50-62` define the same 13-line function with the same array-vs-object discrimination. Two callsites = the abstraction threshold. Hoist to `lib/utils/stats-categorizer.ts` (where its consumers live) or to a thin `lib/utils/percentiles.ts`.

Same observation applies to `categoryToChartStats` (`StatsTab.tsx:70-84`, `CompareTab.tsx:64-78`) — also duplicated.

### 15. VibesTab's `metaReady` signal duplicates EntityMeta's preload work

**Severity:** Low
**Effort:** S
**Aligns with:** Simple

`VibesTab.tsx:125,134-137` has its own signal and effect to trigger `entityDataStore.loadMeta(sport)` and flip `metaReady` to true. The store dedupes (`entity-data-store.ts:179-181`) so the network call isn't doubled. But the signal ladder exists only because the blurb wants the player/team name from the meta DB.

**Proposed change:** Inline `await entityDataStore.loadMeta(sport)` into the start of `fetchVibe`. Drop the `metaReady` signal and its effect. The `names` memo can read `entityDataStore.getPlayerMetaSync` once the resource resolves; since the resource only resolves after `loadMeta` completes, the meta is guaranteed available. Two fewer signals.

### 16. Directory rename `src/components/solid/` → `src/components/`

**Severity:** Low
**Effort:** S
**Aligns with:** Simple

Suspicious area #4. The `solid/` segment is an Astro fossil — in Astro, it disambiguated `.tsx` islands from `.astro` components in the same parent. Pure Solid project, the segment carries no information.

**Proposed change:** `git mv src/components/solid/* src/components/`, then a `sed`-style search-and-replace on every `from '../components/solid/...'` and `from '../../components/solid/...'` import, then `rmdir src/components/solid/`. Aliases in `vite.config.ts:18` (`"@components": "/src/components"`) are unaffected.

**What we lose by skipping:** Aesthetic tax: every `import` line is two characters longer than it needs to be. Real cost: zero. Defer or skip — this is the lowest-priority thing in the audit. Flagging only because the brief asked.

### 17. Note: `@jsxImportSource` cleanup is verified complete

**Severity:** Note
**Effort:** —
**Aligns with:** —

Suspicious area #7. `grep -rn 'jsxImportSource' src/` returns nothing. The cleanup the prior session claimed is, in fact, complete. No action needed.

### 18. Note: defensive `isServer` guard in `EntityMeta.onCleanup` is fine as-is

**Severity:** Note
**Effort:** —
**Aligns with:** —

`EntityMeta.tsx:241-247` nests an `onCleanup` inside `onMount`, which already prevents SSR teardown from running it, and *then* adds a defensive `if (isServer) return;` inside the cleanup. Belt-and-suspenders, but the prior session's reasoning ("cheap insurance against future maintainers flipping the nesting") is sound. Cost is one line. Don't touch.

### 19. Note: `stores/sport.ts` reads `sessionStorage` at module-init

**Severity:** Note
**Effort:** —
**Aligns with:** —

`sport.ts:13-22` reads `sessionStorage` and `localStorage` at module load to seed the initial atom value. On SSR, these globals don't exist; the try/catch silently swallows. Effect: SSR always seeds `'nba'`. Acceptable — the sport persistence is a UX nicety, not a correctness requirement, and the SSR shell is going to hydrate to the client value anyway. Worth knowing if you ever debug "why does the SSR HTML show NBA when the user's last sport was NFL." No action needed.

### 20. Note: SearchBar / CompareSearch fuzzy-match logic is duplicated, but two callsites is below the abstraction threshold

**Severity:** Note
**Effort:** —
**Aligns with:** Simple

`SearchBar.tsx:47-52` and `CompareSearch.tsx:21-24` both define `fuzzyMatch`. Two near-identical functions — but the project's `CLAUDE.md` rule is "three similar lines is better than a premature abstraction" and this is exactly the case for not abstracting yet. Flag for revisit when a third autocomplete bar appears (e.g., when `scoracle-sandbox` ports the same widget).

The diacritic-normalization gap (finding #8) is the actual divergence to fix; the code structure can stay duplicated.

---

## Closing context

What's deliberately *not* in this audit:

- **No proposal to introduce Tailwind, CSS-in-JS, a different state manager, a different fetching library, or a UI component library.** The locked constraints from `CLAUDE.md` and the architecture wiki rule those out.
- **No proposal touching `~/Scoracle`.** Port-source only.
- **No proposal to rework `worker.ts`, the dev proxy, the per-route rendering mode, the bundled-JSON pipeline, or the design system.** All deliberately shaped per the brief's intentional-decisions list.
- **No proposal to split or rebuild the four-page surface.** Single-profile-page, lazy tabs, islands-own-data — all locked design pillars, all working as intended.

The cutover is not blocked by any finding here. The two findings worth doing *before* the DNS flip are #2 (lazy-load leak — small fix, observable bandwidth win) and #7 (anchor onClick — small fix, real UX bug). Everything else is queueable for the post-cutover week.
