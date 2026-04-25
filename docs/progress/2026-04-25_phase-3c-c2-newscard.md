# Phase 3c, Commit 2 — NewsCard + 4 tabs (News, X, CoMentions, Vibes)

**Date:** 2026-04-25
**Scope:** Ship the entire NewsCard composition — its TabContainer wrapper plus all four tab content components. None of them is imported by a route yet, so still no behavior change in browser. Typecheck-clean.

## Goal — and a course-correction from the original plan

The Phase 3c plan called for `NewsCard + NewsTab + CoMentionsTab` in C2 and `VibesTab + XTab` in C3. Reading `NewsCard.tsx` revealed that NewsCard imports all four tab components in its `TabDef[]` array — they ship together or NewsCard breaks. Merged C2 + C3 into a single commit; the audit task numbering shifts (C8 stays the audit at the end).

The Astro `CLAUDE.md` is even more out of date than expected on this front:

| CLAUDE.md says | Reality (per `~/Scoracle/src/components/solid/`) |
|---|---|
| `NewsCard` has News / Co-mentions / Vibes tabs | News / **X** / Co-mentions / **Vibes** (4 tabs, not 3 — X added 2026-04-19, Vibes is itself rewritten) |
| Vibes tab shows a Gemma-generated blurb | **Vibes is a numeric 1–100 sentiment score** with emoji buckets and a randomized blurb owned by the frontend (per the 2026-04-22 vibe-pivot in the vault changelog and project memory) |

This commit ports the actual current state of those four tabs.

## What Was Done

### `NewsCard.tsx`
Verbatim 23-line port — composes `TabContainer` with the four tabs, defaults to `news`. `@jsxImportSource` directive removed.

### `NewsTab.tsx` + `.css`
Reads URL params at setup (`URLSearchParams(window.location.search)`) — same SSR landmine as `EntityMeta`, will be wrapped via `clientOnly` at the route in C7.
- Fetches `newsUrl(sport, type, id)` via `swrFetch` with `CACHE_PRESETS.news` (2-min stale, 10-min cache).
- Publishes the article array to `$newsArticles` nanostore + `setPageData('news', ...)` so `CoMentionsTab` can fold news into co-mention scanning.
- Lazy-loads via the `isActive` render prop pattern from `TabContainer` (`createSignal(false)` + effect).

### `CoMentionsTab.tsx` + `.css`
Uses `parseEntityParams()` from `dom.ts` (same SSR landmine, same `clientOnly` wrap).
- Awaits `waitForPageData('news', 3000)` for the news articles, then merges in any tweets already in `pageData('tweets')`.
- Calls `findCoMentions()` from `lib/utils/co-mentions.ts` to cross-reference mentioned entities.
- Renders expandable rows with native `<details>` / `<summary>` (zero-JS toggle + chevron rotation via CSS).

### `XTab.tsx` + `.css`
The 2026-04-19 replacement for the legacy Twitter tab.
- Calls `twitterStatusUrl()` first to check if X integration is configured for the active sport (gates against unconfigured sports — backend tier-restricted).
- Fetches `twitterEntityFeedUrl(sport, type, id, 20)` for up to 20 tweets.
- Publishes to `$tweets` nanostore + `setPageData('tweets', ...)` so `CoMentionsTab` can fold tweets into co-mention scanning.
- Tweet card renders author, handle, text, like / retweet metrics, "View on X" link.

### `VibesTab.tsx` + `.css`
The 2026-04-24 component for the Gemma vibe-score pipeline.
- Fetches `vibeUrl(sport, type, id)` for the latest sentiment row.
- Three states:
  - 200 with a numeric `sentiment` (1–100) → emoji + score + randomized flavor blurb. Tier (1–5) computed from `Math.min(4, Math.max(0, Math.floor((score - 1) / 20)))`.
  - 200 with `sentiment === null` → "Not enough news yet" + lonely robot SVG.
  - 404 / fetch error → "Model is training" + happy robot SVG.
- Loads the meta DB so the blurb can include the entity + team name (`"${team} ${name}"` template).
- Blurb randomization uses `Math.random()` inside a `createMemo` — only fires when reactive deps change, not at component setup, so SSR-safe.

## Files Changed

Added (9):
- `src/components/solid/NewsCard.tsx`
- `src/components/solid/NewsTab.tsx`, `NewsTab.css`
- `src/components/solid/CoMentionsTab.tsx`, `CoMentionsTab.css`
- `src/components/solid/XTab.tsx`, `XTab.css`
- `src/components/solid/VibesTab.tsx`, `VibesTab.css`

Plus `docs/progress/2026-04-25_phase-3c-c2-newscard.md` (this file).

## Verification

- Pre-port lib check: `vibeUrl`, `newsUrl`, `twitterStatusUrl`, `twitterEntityFeedUrl` all confirmed in our ported `data-sources.ts`. Article type confirmed in `co-mentions.ts` (zero-diff verbatim port from Phase 3a). $tweets store from Phase 3a.
- `npm run typecheck` → clean.
- `vite dev` → boots in ~250 ms.
- All four existing routes still serve unchanged (no new imports yet).
- No new warnings or errors in dev log.

## Caveats / follow-ups

- All four tab components read URL params at setup → must be wrapped via `clientOnly` at the consumer in C7. Same pattern as EntityMeta and CrystalBall.
- The CSS uses `:global(.dark)` selectors and `--percentile-*` token references. Both are in the same boat as the dark-mode-pre-paint TODO from Phase 3b: light mode renders correctly, dark mode and percentile color tiers are pending. Tracked.
- VibesTab's `Math.random()` is inside a `createMemo`, not at component setup — SSR-safe even without `clientOnly` (it'd never fire on server because the parent `<Show when={vibe()}>` gates on a resource that doesn't resolve on the server). No SSR mismatch.

## Result

Card-front composition is in tree. `NewsCard` will drop straight into the profile route's flip-card front in C7 with no further changes to the components themselves. Next: **C4 — PizzaChart + StatsTab** (the largest single commit; StatsTab is 18 KB and PizzaChart is 14.6 KB).
