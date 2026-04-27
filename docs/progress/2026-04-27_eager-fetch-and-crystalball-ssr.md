# Eager fetching for all profile tabs + SSR-safe CrystalBall

**Date:** 2026-04-27
**Scope:** Reverse the audit's lazy-load gating (#2) per product feedback; SSR-render the home-page CrystalBall to remove the empty-then-pop logo flicker.

## Goal

User feedback after the audit refactor surfaced two flickers:

1. **Profile flickers** — clicking "Statistical Profile" (the EntityMeta toggle that flips the card to Stats) and clicking the Vibes tab both showed a brief skeleton during the fetch. This was the natural cost of the audit's finding #2 (cardActive gating + per-tab lazy-load latches): fetches fire on activation, so first activation always pays the network cost.
2. **Home flicker** — the CrystalBall was wrapped in `clientOnly()` because it called `Math.random()` at component setup. SSR rendered nothing for the carousel, then on client hydration the whole component popped in. Visible empty space → content jump.

Product call: bandwidth and "lazy purity" are no longer worth the visible UX regression. The API is self-owned, served behind Cloudflare edge cache, so firing all tab fetches on profile mount is fine. CrystalBall should SSR with a deterministic initial state and randomize silently on hydration.

## What Was Done

### Profile: eager-fetch every tab on mount

Reverted the `cardActive` + `props.active` lazy-load gating that came in with audit findings #2 and #6. Each tab now fires its data fetch on client mount, regardless of which card or tab is currently visible. By the time the user clicks any toggle or tab, the data is already loaded or in flight — no skeleton-from-cold.

- `TabContainer.tsx`: dropped the `cardActive` prop. `TabDef.content` is now a plain `JSX.Element` instead of a `(isActive: () => boolean) => JSX.Element` factory — every tab panel is mounted up-front, the `.active` class on the panel still controls visibility via CSS.
- `NewsCard.tsx`, `StatsCard.tsx`: stop passing `cardActive`; tabs are direct JSX (`<NewsTab />`, `<StatsTab />`, etc.).
- `NewsTab.tsx`, `StatsTab.tsx`, `XTab.tsx`, `VibesTab.tsx`, `CoMentionsTab.tsx`, `CompareTab.tsx`, `TraitsTab.tsx`: each tab dropped its `props: { active: () => boolean }` interface and the `shouldLoad` `createMemo` latch. The createResource source is now `() => !isServer` — false on SSR (skeleton renders), true on client (fetcher fires once after hydration). The outer "have we activated yet?" `<Show>` wrapper around each tab's render is gone too; the only loading gate left is `<Show when={!data.loading}>` for the in-flight skeleton.

The data flow stays correct because:
- TraitsTab is pure derivation off `$statsData`; StatsTab now fires on mount, so by the time the user clicks Traits, `$statsData` is set.
- CoMentionsTab depends on `$newsArticles` + `$tweets`; both NewsTab and XTab now fire on mount. Sport entity directory loads on mount in CoMentionsTab too.
- ProfileContext doesn't need to expose `view` anymore for fetch gating, but it still drives the flip-card animation via `view()` and `setView()` on the EntityMeta toggle, so the context shape is unchanged.

The audit's #1 (no `clientOnly` on the cards), #3 (nanostores for cross-island state), and #4 (no CustomEvent bridge) all remain in place. This commit reverses #2 and the user-facing half of #6 — the latch part — while keeping the `createMemo`-over-effect simplification where it's still useful.

### Home: SSR-safe CrystalBall, drop `clientOnly`

- `CrystalBall.tsx`: removed `Math.random()` at component setup. `currentIndex` initializes to `0` (deterministic for SSR — first sport in the `props.sports` list). On client mount, `onMount` jumps to a random index and starts the cycle.
- A `suppressTransition` flag short-circuits `onBeforeEnter` / `onEnter` / `onExit` during the on-mount jump so the random index swap snaps in without the slide-fade animation. A `queueMicrotask` releases the flag immediately after, so subsequent auto-cycles animate normally.
- `routes/index.tsx`: dropped the `clientOnly()` wrapper around `CrystalBall`. The component is a real, top-level import now.

The home page SSR HTML now contains the full `crystal-ball-container` markup — main logo, sport logo, search bar — instead of an empty `<div class="central-card">` waiting for client JS.

## Files Changed

**Modified**
- `src/components/solid/TabContainer.tsx` — drop `cardActive` prop, simplify `TabDef.content` to `JSX.Element`
- `src/components/solid/NewsCard.tsx` — direct JSX for each tab, drop cardActive plumbing
- `src/components/solid/StatsCard.tsx` — same
- `src/components/solid/NewsTab.tsx` — drop `props.active` + shouldLoad latch; createResource source = `() => !isServer`; simplify render
- `src/components/solid/StatsTab.tsx` — same
- `src/components/solid/XTab.tsx` — same
- `src/components/solid/VibesTab.tsx` — same
- `src/components/solid/CoMentionsTab.tsx` — same; entity directory load gated on `(!isServer && sport)`
- `src/components/solid/CompareTab.tsx` — same; primary entity stats fetched eagerly
- `src/components/solid/TraitsTab.tsx` — drop unused `_props` parameter
- `src/components/solid/CrystalBall.tsx` — SSR-safe init, on-mount randomization, suppressTransition flag for the initial jump
- `src/routes/index.tsx` — direct import of CrystalBall, drop `clientOnly`
- `docs/progress/2026-04-27_eager-fetch-and-crystalball-ssr.md`

## Verification

- `npm run typecheck` — green.
- `npm test` — 67/67 passing (data utilities are unaffected).
- `npm run build` — green.
  - Server `profile-*.js`: 116.97 → 114.91 KB (the `shouldLoad` memos and the `cardActive` plumbing dropped out).
  - Server `entry-server.js`: 87.38 → 86.78 KB.
  - Home `index-*.js` chunk gains some weight (~5.5 KB) because CrystalBall is now bundled inline instead of split out via `clientOnly`.
- Dev server: `curl http://[::1]:<port>/` returns 24 KB SSR HTML containing `crystal-ball-container`, `crystal-logo`, `crystal-selector`, `sport-option` — the carousel now renders server-side.
- `curl http://[::1]:<port>/profile?sport=NBA&type=player&id=1` returns 60 KB SSR HTML with all skeletons (`meta-widget`, `pw-loading`, `tab-loading-skeleton`, `chart-skeleton`, `sw-loading`) and **no** `<div class="card-error">` block — proving fetches still defer to the client.

## Result

- **No flicker on the profile flip toggle.** Stats data is loaded by the time the user clicks. Same for Vibes / Compare / Traits — all eager.
- **No flicker on home page load.** The crystal ball + main logo + search bar render server-side. The randomization swap happens silently before the first cycle animation, so users don't see "NBA → random sport" cross-fade.
- **All four findings closed:** #1 SSR shell, #2 reversed (consciously), #3 nanostores, #4 no event bridge — plus a proactive home-page SSR fix that wasn't in the audit.
- **Cost:** every profile page-view now fires 5–7 entity-related API calls instead of 1–2. With CF edge caching in front of api.scoracle.com, the marginal load is negligible. Per-page payload is 5–50 KB of additional HTTP traffic the user pays for, against the alternative of a skeleton flicker on every flip.

## Note on the original audit

This commit consciously reverses audit finding #2 ("Stop fetching the hidden card's default tab") based on user feedback. The audit's reasoning was sound at the time — bandwidth and lazy-load purity matter when those are the load-bearing constraints. They aren't here: the API is owned, edge-cached, and serving small JSON. The pillars from `CLAUDE.md` are "snappiness + simplicity over cleverness" — perceived snappiness is what won.

The `shouldLoad` collapse from finding #6 stays partially gone too — once the latch is unnecessary, the `createMemo` that wrapped it is also unnecessary. Tabs are simpler than after the audit pass: just `createResource(() => !isServer, fetcher)` and a `<Show when={!data.loading}>`.
