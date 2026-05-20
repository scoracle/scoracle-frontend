# 2026-05-20 — Kill MetaShell hydration pop-in via clientOnly fallback

## Goal

Remove the ~370 px page shift that occurs on every cold load when
EntityMeta (`clientOnly`-wrapped) mounts after hydration. The shift was
exposed when the page-level `min-height: 800px` reservation was dropped
(1fd5c5a) on top of an older SSR omission: `EntityMeta` has been
`clientOnly` since 6388686 (May 9), but was never passed a `fallback`
prop, so SSR HTML shipped with no MetaShell at all. The widget popped
in around t=350-420ms and pushed ContentShell + everything below it
down by the full Shell silhouette height (347 px).

Measured CLS at the start of this session via Puppeteer +
`PerformanceObserver({type:'layout-shift'})`:

| Tab          | Pre-pop scroll | Post-pop scroll | CLS (no-input) |
|--------------|---------------:|----------------:|----------------:|
| News default | 900            | 1077            | **0.194**       |
| Stats        | 3194           | 3566            | **0.180**       |

Both readings are in Core Web Vitals "needs improvement" (>0.1).

## What Was Done

### New file: `EntityMetaSkeleton.tsx`

A 25-line component that renders the same locked Shell silhouette
EntityMeta resolves into — 600 × 348 (the 19:11 tarot aspect),
`cornerLabel={ctx.id}` so the corner numeral lands during SSR, and the
identical 64 px circle + 2 line Skeleton body that EntityMeta's
internal Suspense already uses for its in-flight state.

Lives in its own file rather than re-exported from `EntityMeta.tsx` so
profile.tsx can sync-import the skeleton without pulling EntityMeta's
client-only data layer (entityDataStore, etc.) into the SSR chunk.
EntityMeta itself stays loaded via `clientOnly(() => import(...))`.

### `profile.tsx` — pass the skeleton as the clientOnly fallback

`@solidjs/start`'s `clientOnly` HOC accepts a `fallback` prop. On the
server (`isServer` branch in `clientOnly.js`), it returns *only* the
fallback — no real component, no dynamic import. On the client, the
fallback renders until the dynamic import resolves + onMount fires,
then the real component takes its place.

```tsx
const EntityMeta = clientOnly(() => import("../components/solid/EntityMeta"));
import EntityMetaSkeleton from "../components/solid/EntityMetaSkeleton";
// ...
<EntityMeta fallback={<EntityMetaSkeleton />} />
```

SSR HTML now ships the locked Shell silhouette in place. Client hydrates
inside that same silhouette and resolves the inner body. The chrome
never moves; only the contents of the locked footprint swap.

### `EntityMeta.tsx`

No structural change — the existing inline Suspense fallback (same
3-skeleton shape) is intentionally left in place rather than DRY'd into
`EntityMetaSkeleton`. Two copies of three `<Skeleton>` lines doesn't
pay back the indirection of importing the body separately, and the
inline fallback runs inside the already-mounted EntityMeta Shell —
slightly different mount context than the SSR fallback.

## Files Changed

```
src/components/solid/EntityMetaSkeleton.tsx (new, 25 lines)
src/routes/profile.tsx                       (+6 / -1)
docs/progress/2026-05-20_metashell-ssr-fallback.md (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 110/110 pass (no behavior change to existing tests).
- Puppeteer re-run against the dev server after the fix:

| Tab          | Pre-pop scroll | Post-pop scroll | CLS (no-input) |
|--------------|---------------:|----------------:|----------------:|
| News default | 1077           | 1077            | **0.0000**      |
| Stats        | 3566           | 3566            | **0.0000**      |

`meta=347` from the very first sample (t≈60ms) on both tabs — SSR
silhouette lands intact, no shift during hydration. PerformanceObserver
emitted zero `layout-shift` entries on either route.

Visual: post-fix screenshot at `/profile?...&tab=vibes` shows the
profile page resolving with no perceptible jump.

## Result

Cold-load CLS on the profile page drops from "needs improvement" (0.18–0.19)
to **0** — under the Good threshold by a comfortable margin. The shift
that returned after the `min-height: 800px` bandaid removal is now
fixed at its actual root, not papered over with a fresh reservation.

The `clientOnly` HOC pattern is now used the way it was meant to be —
with a fallback shaped like the resolved component so SSR HTML reserves
the right silhouette. The same pattern can be applied to any future
client-only wrapped Card whose silhouette is predictable.

## What's NOT in this commit (intentional)

- **Tab-switch height jumps** (Stats 2836 px ↔ Vibes 347 px ↔ Articles
  1077 px). Switching tabs still resizes the page by thousands of pixels
  in a single frame. This is by design (page reactive to active pane's
  content) but the magnitude is jarring on Stats specifically. The fix
  is architectural — splitting StatsCard into per-category child Cards
  (Phase D in the wiki plan), each locked at the standard Shell
  silhouette. Out of scope for this CLS fix.
- **xG percentile gap** (from the same session's question). xG values
  ship as 0.0 because SportMonks gates xG behind their advanced/premium
  include; the backend's percentile recalc has a `(val::text)::numeric
  != 0` filter (sql/migrations/012:257) that drops any all-zero stat
  from the percentile JSON. Frontend wiring is correct; fix is
  upstream in the backend ingest. Documented in conversation, not in
  this commit.
