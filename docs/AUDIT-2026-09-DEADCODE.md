# Audit — Dead Code, Complexity, and Hand-Rolled Mechanics

Date: 2026-09-27 · Follow-up to `AUDIT-2026-09.md` (Tiers 1–4)
Stack: `solid-js@2.0.0-rc.8`, `@solidjs/web@2.0.0-rc.8`, `@solidjs/router@2.0.0-next.24`.
Continuation of the **"eager load everything"** philosophy (see AUDIT-2026-09.md).

Every recommendation below was checked against the *installed type files*, not memory. Three
proposals were tried and reverted; two agent findings were wrong and are recorded as such.

## Guard added

`npm run typecheck` now runs `tsc --noEmit --noUnusedLocals --noUnusedParameters`. The
repo previously typechecked without those flags, which is why ~20 unused locals had
accumulated unnoticed. This is the standing guard against dead code returning.

---

## 1. Dead code removed

### 1.1 Unused imports and locals (`tsc --noUnusedLocals` was the ground truth)

| Site | Removed |
| --- | --- |
| `AppTray.tsx:4` | unused `JSX` type import |
| `card-registry.tsx:1` | unused `createMemo` |
| `contexts/profile.ts:1` | unused `createMemo` |
| `MomentumCard / NarrativesCard / ProfileCard / ScoutingCard / SigilCard / TransfersCard / VibeCard` | unused `id` from the `ctx` destructures |
| `WeekCard.tsx:51` | dead `const ref = () => parseWeekKey(ctx.week())` **and** the now-dead `parseWeekKey` import |
| `leaderboard.tsx:245` (`readBoard`) | 6 unread members of a 15-name destructure |
| `leaderboard.tsx:297` (`Leaderboard`) | 3 further unread members |
| `AppTray.tsx:3` | `export { BrandMark }` — nobody imports `BrandMark` *from AppTray*; its only consumer imports from `./Icon` |

The two `leaderboard.tsx` destructures are byte-identical, so they had to be edited by line
number rather than by pattern.

### 1.2 Unreachable missing-Provider guards

`contexts/profile.ts` and `lib/data/profile-data.ts` both had:

```ts
const ctx = useContext(ProfileContext);
if (!ctx) throw new Error("useProfile() called outside <ProfileContext>");
```

Both contexts are created **default-less**, so this branch is unreachable — and the types say
so. From `node_modules/solid-js/types/client/core.d.ts:85-117`: `createContext<T>(defaultValue?: T)`,
`useContext<T>(context): T` (non-nullable), `@throws ContextNotFoundError if no Provider is
mounted`, and verbatim: *"There is no need for a wrapper hook that throws on missing Provider
— the default-less form already does that, and its return type is `T`."* The old guard also
narrowed a value the compiler believed was non-nullable. Both collapsed to one-liners.

### 1.3 Dead CSS (all verified zero references, and zero occurrences in the built bundle)

| Removed | Notes |
| --- | --- |
| `global.css` `.route-progress` + `@keyframes route-progress-sweep` + reduced-motion branch | **42 lines.** A fully-designed feature nothing renders. `@solidjs/router` exports `useIsRouting()` — this is revivable in one line if the hairline is wanted. |
| `global.css` `--shadow-cast`, `--shadow-edge` (4 declarations, `:root` + `.dark`) | The 4-step shadow ladder keeps only `--shadow-ambient` / `--shadow-contact`; neither removed token has a single `var()` consumer. |
| `ScoutingCard.css` `.category-chart-label`, `.overall-score-content` | Both documented retired CompareCard chrome. |
| `Skeleton.css` `.skeleton-block` | No call site passes `shape="block"`. |
| `content-cards.css` `.card-loading` | No renderer. |
| `EmptyCard.css` `.empty-card-note` + the never-passed `EmptyCard.note` prop | The prop was declared, documented, and read by a `<Show>`, but no one ever passed it. |

### 1.4 Stale test selector

`ReadingTable.test.tsx:103` asserted on `.card-loading-face` — **a class that exists nowhere
in the repo**. Its sibling selector `.deck-back-loading` is real, so the assertion silently
half-worked. Reduced to the live selector.

### 1.5 A no-op cleanup

`ReadingTable.tsx` had `onSettled(() => () => { swipeStart = null; })`. `swipeStart` is a
local that falls out of scope regardless, and every gesture already resets it at `:514`. The
cleanup only obscured that.

---

## 2. Hand-rolled mechanics replaced

### 2.1 The tab-resolution chain (highest value)

`ReadingTable` resolved its tab set through five plain closures. `activeTab()` alone has
**13 read sites** and `activeControls()` 6; each read re-ran the full resolution — registry
scan, `dealt()`, `heldCard()`, the archive `Set` — and its two neighbours (`dealt`,
`heldCard`, `weekArchive`) were *already* memos. The layer was simply missed.

`registryTabs`, `visibleTabs`, `activeTab`, `navItems`, `activeControls` are now `createMemo`.
Call sites are unchanged (each is still called as a function).

**This deleted a workaround added earlier in the same session.** `navItems` minted a fresh
`{id, label}` per call, which is what had forced `NavWell` to depend on a joined
`"id:label"` signature string and to carry an explicit `keyed` prop. With the producer
memoized, identity is the correct dependency; `railSignature` is deleted. `keyed` was kept —
it is cheap and survives a caller that regresses.

### 2.2 The last un-memoized derivation

`ProfileCard.tsx`'s compare-face `stats()` built two `Map`s, a `Set`, a label union and N
fresh objects on every read — the *exact* defect the file's own comment identifies 40 lines
above it for `pizzaStats` (which was memoized in Tier 2). `pizzaStats` got `createMemo`;
`stats()` did not. Now it does.

### 2.3 `leaderboard` season derivations

`ratingSeasons`, `seasonOptions`, `selectedSeason` were plain closures, each re-slicing the
board payload on every read, and each read more than once per render. All three memoized.

### 2.4 `PageAtmosphere`'s `.map`

`{["left", "right"].map(...)}` was the only raw `.map` producing JSX in `src/`. A literal
array expression is a *new array on every evaluation*, so `insert` recreated both panels —
and re-read `art()` twice — on every render. Written out statically. (Note this file renders
on `/` and `/leaderboard`, so it is not a cold path.)

### 2.5 A self-correction: `dynamic()` was an over-correction

Tier 4.8 replaced `AppTray`'s handrolled theme-icon registry with
`dynamic(() => () => <Icon name={…}/>)`. That was wrong: `dynamic` selects among *different
component types*, but this selects a single component's **reactive prop**, and `Icon` already
accepts a reactive `name`. It added a memo, an untrack layer and a re-resolution step to do
nothing. Reverted to `<Icon name={THEME_ICON_NAMES[themePref()]}/>`, which also removed the
`dynamic` import. Recorded in AUDIT-2026-09.md as a Tier 4 correction.

### 2.6 An impure signal updater in `AppTray`

`setRecents` was called with an updater that performed a `localStorage` **write** inside it:

```ts
setRecents((current) => { …; writeRecents(updated); return updated; });
```

A signal updater must be pure — it is re-invoked whenever the signal recomputes, so the
write fired on every re-read of `recents`, not once per new profile. Persistence is now its
own effect.

---

## 3. Tried and reverted (recorded so they are not re-attempted)

- **`merge()` for `CardVessel`'s host props.** `merge` is Solid's documented
  "merge defaults/overrides without losing per-property tracking" helper, and the manual
  getter object is the same idea. But `Merge<T>` preserves a function source *as a function*,
  so spreading it into a JSX element types `style` as `() => …` instead of `CSSProperties`
  and fails to compile. `merge` is for component *inputs*
  (`const props = merge({type:"button"}, _props)`), not for building a DOM spread. The getter
  object is the type-correct form; the reasoning is now recorded at the call site.
- **`AppTray` → `<Disclosure>` as a component.** `AppTray`'s `dismissalHandlers` + its
  `createEffect` were a near-verbatim restatement of `Disclosure`'s, so ~40 lines were
  duplicated. But `Disclosure` wraps trigger+panel in its own `.disclosure`
  `position:relative` anchor, its `triggerClass` is a plain string (the tray's row class is
  state-dependent), and the tray has **zero** browser test coverage. Bad trade for 40 lines.
  **The duplication is now gone anyway** by sharing the *behavior* instead:
  `src/lib/utils/dismissal.ts` exports `registerDismissal({contains, close, focusTrigger})`,
  and both consumers call it. No DOM change, no pillar API change, and
  `browser/dismissal.spec.ts` (new) covers both.
- **Removing the `typeof window === "undefined"` guards in `AppTray`.** An audit finding
  claimed these sit inside `onSettled` callbacks and are dead because `onSettled` never runs
  on the server (confirmed true — `node_modules/solid-js/dist/server.js:1447` is a no-op that
  only advances the hydration id). **The claim was wrong**: they are guards inside
  module-level storage helpers (`readRecents`, `writeRecents`, `readExpanded`,
  `writeExpanded`), which are generic. Left alone.

## 4. Found, deliberately NOT changed

| Item | Why |
| --- | --- |
| `CARD_SHARING_ENABLED = false` (`Card.tsx:141`) gates `<CopyCardButton>`, which is the only caller of `ShadowCard`'s `captureShadowCard`, which is the only consumer of `html-to-image`. | An explicit, labelled feature park: *"Sharing is parked, not removed. Restore this switch…"*. **But see the note below** — this is ~300 lines plus a dependency that the *eager* philosophy puts in every pageview. |
| `src/lib/vibe/reversal.ts` (129 lines) + its 145-line test | Documents a `SigilCard` "reversed illustration" behavior that was never wired into `SigilCard`. Nothing imports it, so Rollup tree-shakes it (verified: 0 occurrences in the entry chunk) — zero runtime cost, purely a repo-hygiene question. Unlike the share park there is no "parked" marker. |
| 27 of 38 icons in `src/lib/icons.generated.ts` unreferenced | **Generated** by `scripts/sync-token-assets.mjs` and enforced by `npm run check:assets`; the unused entries are upstream data from `@scoracle/tokens`, not hand-editable. |
| `M1` — the `Map<id, createMemo>` presence table in `ReadingTable` | Same cold-start hazard that made Tier 2.3's memo sharing get reverted (a cold cache dropped 4 of 7 cards). Must not be touched until that is fixed, per AUDIT-2026-09.md T2.3. |
| `L5` — `Disclosure` registers both `pointerdown` and `mousedown` with the same handler | Redundant (pointerdown already covers mouse/pen/touch) and makes every outside-click close run twice, but `mousedown` is the older-API fallback. Removing it is a small behavioural bet for a small win. |
| `H4` — `Portal` for the lift backdrop | **Declined again, 2026-09-27.** The current placement is already deliberate and documented ("this sibling sits outside the resting panes' rotated containing blocks"). The lift has `ReadingTable.test.tsx` unit coverage but **no browser coverage**, and `Portal` would change `position: fixed` stacking, z-index against the tray/pop-outs, and the scroll-lock — none of which happy-dom can validate. Same reason the `AppTray` → `<Disclosure>` adoption was declined. Add a browser test for the lift first, then this is a small change. |
| `H5` — `useHead` for the AdSense loader | **DONE.** `Document.tsx` now uses `useHead({tag:"script", props:{src, async, crossorigin}})`, guarded by `!isServer` so the server does not put a third-party script in every crawler's HTML (server `useHead` registers into the SSR document, `server.js:1144-1150`). Preserves the original hazard's guarantee because the client body is an effect (`web.js:1170`), and gains dedupe: a `script` with `src` is a head resource (`web.js:208-210`) mounted via `findAssetElement` (`web.js:1138`). Covered by `browser/adhead.spec.ts`. |
| `M2`/`M3`/`M4` — `createStore` for the lift triad, `SearchBar`'s signals, `theme.ts` | Sound but mechanical; no defect today. Bundle the store conversions together if wanted. |

### A note on the share park, given "eager load everything"

Tier 1.3 flagged `html-to-image` as the single most valuable lazy-load target, then chose the
WebP path instead. That reasoning still holds, but the situation is now sharper: with sharing
parked, `html-to-image` is imported by `ShadowCard.tsx` and reached from `Card.tsx` — so under
the eager philosophy it is **in the entry chunk for 100% of pageviews while being reachable
from 0% of them**. The options are (a) flip `CARD_SHARING_ENABLED` to `true`, making the
parked work real, or (b) delete `CopyCardButton` + `ShadowCard` and drop the dependency.
Lazy-loading it would contradict the stated philosophy. This is a product decision, not a
cleanup, so it is flagged rather than made.

---

## 5. Validation

| Gate | Result |
| --- | --- |
| `npm run typecheck` (now with `--noUnusedLocals --noUnusedParameters`) | clean |
| `npm test` | **221 passed / 33 files** |
| `npm run build` | clean; ceilings pass |
| `npm run verify:ssr` | all 4 routes — "full SSR content, identical for browser and crawler" |
| `npm run test:browser` | **20 passed** against the real API via the archbox tunnel |
| Entry bundle | 284.1 kB raw / 92.3 kB gzip (ceiling 320/105); CSS 73.9/14.9 (ceiling 88/17) |

Entry JS is 0.4 kB *smaller* than the start of this pass despite the added memoization —
the dead code removed more than the new `createMemo` wrappers cost.
