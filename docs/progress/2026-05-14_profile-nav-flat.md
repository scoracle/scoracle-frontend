# 2026-05-14 — Profile nav flattens to 6 siblings

## Goal

Replace the profile page's parent (News / Stats) + child sub-strip
nav model with one flat `<NavTabs>` strip of six siblings (Articles
/ X / Vibes / Stats / Traits / Compare). The conditional sub-strip
swap was the actual source of the sporadic CLS regression on
Cloudflare deploys; removing the swap removes the source.

## What Was Done

### ProfileContext collapses to one signal

`src/contexts/profile.ts`:

- Drops `ProfileMode`, `NewsSubTab`, `StatsSubTab` types.
- Adds `ProfileTab = "news" | "x" | "vibes" | "stats" | "traits"
  | "compare"`.
- `ProfileContextValue` exposes `activeTab: Accessor<ProfileTab>` +
  `setActiveTab: Setter<ProfileTab>` instead of the three previous
  signal pairs.
- `PercentileScope` stays (still consumed by StatsCard / TraitsCard
  / CompareCard for the "all vs scoped" percentile toggle).

### Tab parser collapses

`src/lib/utils/profile-tabs.ts`:

- `deriveInitialTabs(tabParam) → { mode, newsSubTab, statsSubTab }`
  becomes `deriveInitialTab(tabParam) → ProfileTab`.
- One valid-set membership check plus a default-fallback to "news".

`src/lib/utils/profile-tabs.test.ts`:

- Three `it` blocks: defaults, every valid tab round-trips,
  case-insensitive. (101 tests now; was 102 — net -1 from the
  test-shape change.)

### Profile route hands a single signal to the context

`src/routes/profile.tsx`:

- Drops `ProfileMode` / `NewsSubTab` / `StatsSubTab` imports.
- Replaces three `createSignal` lines with one
  `const [activeTab, setActiveTab] = createSignal<ProfileTab>(...)`
  seeded from `deriveInitialTab(searchParams.tab)`.
- Header comment updated to describe the flat nav model.
- `percentileScope` signal stays.

### ContentShell rewrites to one flat strip + one sticky-mount set

`src/components/solid/ContentShell.tsx`:

- Six-entry `PANES` table keyed by `ProfileTab` (no composite
  `mode:tab` keys).
- One `<Shell as="nav" template="dynamic" class="profile-nav-shell">`
  containing one `<NavTabs items={NAV_ITEMS} active={ctx.activeTab()}
  onSelect={ctx.setActiveTab} variant="feature">`.
- `mounted` signal is `Set<ProfileTab>`. Sticky-mount preserved.
- `<For each={PANES}>` over the panes with `<Show
  when={mounted().has(pane.tab)}>` gating + `classList={{ active:
  ctx.activeTab() === pane.tab }}`.
- Drops the two `<Show when={ctx.mode() === ...}>` blocks that
  previously swapped between News and Stats sub-strips.

### Doc comment cleanup

`src/components/solid/NavTabs.tsx` — generic-example comment
updated from `NavTabs<NewsSubTab>` to `NavTabs<ProfileTab>`.

`src/lib/utils/share-url.ts` — header comment updated: `tab`
mirrors `ProfileTab` instead of `NewsSubTab | StatsSubTab`.

## Files Changed

```
src/contexts/profile.ts
src/lib/utils/profile-tabs.ts
src/lib/utils/profile-tabs.test.ts
src/routes/profile.tsx
src/components/solid/ContentShell.tsx
src/components/solid/NavTabs.tsx          (doc comment)
src/lib/utils/share-url.ts                (doc comment)
docs/progress/2026-05-14_profile-nav-flat.md (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101 passing (net -1 from the profile-tabs test
  rewrite).
- `npm run dev`, SSR smoke:
  - `GET /` → 200
  - `GET /profile?sport=football&type=player&id=1100` → 200
  - `GET /profile?sport=football&type=player&id=1100&tab={news,x,vibes,stats,traits,compare}` → 200 for all six
- No errors/warnings in the dev log (just the benign workerd
  `--localstorage-file` notice).

## Result

The profile page now has a single flat nav model. No parent grouping,
no conditional sub-strip swap, no CLS source. ProfileContext shrinks
to one tab signal (plus the unrelated percentileScope). The
`?tab=X` deep-link contract is unchanged for every valid value;
old `?tab=` values that used to land on a sub-tab (Articles, X,
Vibes, Stats, Traits, Compare) still land on the same card.

The profile-nav visually still uses today's `feature` NavTabs variant
+ Shell `template="dynamic"` — those primitive collapses ship in
Commit 2.
