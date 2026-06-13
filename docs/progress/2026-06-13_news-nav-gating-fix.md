# 2026-06-13 — Fix: News feed gating page-to-page navigation

## Goal
Scott reported "big delays going from one page to another, but news is loaded
when I get to the target page." Diagnose and fix.

## Diagnosis (measured, not guessed)
- Timed the prod API: the Twitter feed is **11.9s cold** (then ~0.08s warm);
  every other source is ~0.1s. `getNewsFeed` = news + twitter, so it inherits
  that worst-case latency.
- `ContentShell`'s sticky-mount `mounted` Set **persisted across entity
  navigations** (the profile route stays mounted during client-side nav). So
  once the **News** tab was opened on any player, `NewsCard` stayed mounted
  (CSS-hidden) for every later player, and its `createAsync(getNewsFeed)` was
  re-read on each entity change. Solid's nav transition holds the old page
  until every resource read in the new render resolves — so the transition
  stalled on the slowest source in the app. Hence "news is loaded when I
  arrive": the page literally waited for it before swapping.
- Proved it with request interception (delay only `getNewsFeed` by 8s):
  - Never opened News → transition **~120ms** (feed is fire-and-forget, doesn't gate).
  - After opening News once → transition **~8,140ms** (waits the full feed delay).

## What Was Done
Scoped sticky-mount to the **current entity** in `ContentShell`, with a
**synchronous** visibility guard so it's correct on the first render of a
navigation (before deferred effects run — the naive reset still gated the
*first* post-News nav because `activeTab` + the reset both trail by one effect):
- `mounted` now carries an entity epoch: `{ key, tabs }`.
- `paneVisible(id)` reads live sources during render: same entity → active or
  sticky-visited tab; entity just changed (stored epoch stale) → only the URL's
  `landingTab` (`deriveInitialTab(searchParams.tab)`). This keeps News from
  mounting (and gating) during the transition render.
- `effectiveActive()` mirrors the same fallback for the shown-pane `.active`
  class + nav highlight, so they never disagree on the first frame.
- An accumulate effect settles the set for same-entity tab switches (instant
  revisits preserved).

## Files Changed
- `src/components/solid/ContentShell.tsx` — entity-scoped sticky-mount + synchronous guard.

## Verification (local dev, Playwright — tab labels are "Rating/Special/Trends/Vibe/News/Transfers")
- With `getNewsFeed` delayed 8s: transitions stay ~50–90ms in BOTH "never open
  News" and "after opening News" conditions (was 8,140ms after News).
- News loads on click (uses the eager-warmed cache → 1 fetch on load, no refetch
  on the click); same-entity News→Rating→News is instant (**161ms**, fetch count
  stays 1 — sticky preserved); navigating entities lands on Rating with content
  (no blank, **0** news leak); News on a freshly navigated entity loads correctly.
- Interactive-during-load (Scott's pillar): with the feed delayed 8s, while News
  is the active tab and still loading, switching to Rating/Trends/Vibe/Special is
  **6–31ms** and search-navigating away is **~130ms** — the page stays fully
  interactive; the slow feed renders as it arrives without blocking anything.
- `npm run typecheck` clean; `npm test` 119/119 pass.

## Result
Page-to-page navigation no longer stalls on the news/Twitter feed. NewsCard is
lazy per entity again: mounted on activation, dropped on entity change. The page
stays interactive while any card loads (snappy + render-as-received pillar).

## Preload policy (decided)
Keep the eager `firePreloads` warm of `getNewsFeed` (Scott: Twitter is likely
being removed soon, and the warm keeps the News tab instant). It is now
non-blocking, so the eager call costs nothing in interactivity.
