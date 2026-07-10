# Frontend Architecture Notes

Repo-local implementation guidance for `scoracle-frontend`. Start with `README.md`, then use this file when changing profile composition, data fetches, cards, sharing, or routing.

## Stack

- SolidStart 2.0.0-alpha.2 with pure Vite.
- Solid 1.9.11, pinned exact.
- TypeScript strict.
- Cloudflare Workers through `worker.ts` and the h3 Cloudflare web handler.
- `@scoracle/tokens` for shared CSS custom properties.
- `@solidjs/router` for navigation, `createAsync`, and `query()`.
- `nanostores` plus `@nanostores/solid` for cross-component reactive state.
- Native CSS and custom properties. No Tailwind and no CSS-in-JS.

## Path Aliases

```text
@/*            -> src/*
@components/*  -> src/components/*
@layouts/*     -> src/layouts/*
@lib/*         -> src/lib/*
@pages/*       -> src/routes/*
```

`@pages/*` points to SolidStart routes, not a legacy pages directory.

## Rendering

Routes render with SolidStart async full-document SSR on Cloudflare Workers. The server waits for Suspense work before sending the document, which keeps direct links, crawler previews, and AdSense review surfaces deterministic. Keep crawler-critical work on that first server path; move non-critical eager warmup to the hydrated user path. There is no prerender step.

Server-side fetches use function-level `"use server"` directives in `src/lib/data/*.server.ts`.

`ContentShell` owns each card Suspense boundary and passes the card's named skeleton as fallback. Suspensions should not bubble past `ContentShell` to the route root.

Crawler contract first, eager product loading second: the initial HTML must identify the route/entity and carry useful metadata/content without depending on browser APIs. After top-level hydration, profile products are still allowed to mount and warm eagerly so user navigation stays instant.

### Render Modes

Normal browser requests render `data-scoracle-render="interactive"` and include the SolidStart entry-client script plus modulepreload hints. Google crawler, AdSense preview, and cross-site review iframe requests render `data-scoracle-render="review-ssr"`. Review SSR must keep route-specific HTML and metadata, set `X-Scoracle-Render-Mode: review-ssr`, use CSP `script-src 'none'`, and strip executable client assets from the document. The shared crawler/preview host and user-agent predicates live in `src/lib/utils/review-signals.ts`; request-only logic stays in `review-request.ts`, and browser-only frame/ancestor checks stay in `entry-client.tsx`.

Run `npm run cf:build && npm run verify:ssr` when changing SSR, middleware, route data loading, or review detection. The verifier imports `dist/server/entry-server.js`, supplies a mocked `ASSETS` binding and fixture API, and checks `/`, `/leaderboard?sport=NBA`, and `/profile?sport=NBA&type=player&id=177&tab=sigil` in both interactive and review modes.

### Cloudflare Build Patches

`worker.ts` is the Cloudflare adapter boundary: SolidStart 2.0 alpha does not ship a first-party Workers adapter, so the worker wraps the built h3 app with `h3/cloudflare` and passes Cloudflare bindings through `request.runtime.cloudflare.env`.

Two scripts are intentionally isolated to the build pipeline:

- `scripts/patch-solidstart-error-boundary.mjs` patches SolidStart's built-in fallback title from `Error | Uncaught Client Exception` to `Scoracle`. It fails if the upstream fallback source no longer contains the expected marker. Remove it after upgrading SolidStart to a version that exposes this fallback as configuration or no longer emits the unwanted title.
- `scripts/clean-wrangler-ssr-imports.mjs` removes dead side-effect-only bare imports from Vite server chunks that Wrangler cannot bundle for the Worker target. It fails on a fresh build if the expected imports are absent, which means the upstream output shape changed and the patch should be reviewed. Remove it after the SolidStart/Vite/adapter output no longer emits those dead bare imports.

## Profile Composition

The profile route renders `EntityMeta` plus `ContentShell`.

- `EntityMeta` is the meta display widget. It reads sport/type/id from `ProfileContext`, has no UI state, and publishes the entity ID into its Shell corner slot through `useShell()`.
- `ContentShell` is a borderless layout section. It uses `NavRailStack` above the card panes: an item rail for profile cards, plus a child-composed control rail when the active card declares scoped controls.
- `CARD_REGISTRY` in `src/components/solid/card-registry.tsx` is the source of truth for profile tabs and order. Each entry co-locates `id`, `label`, body component, fallback skeleton, and optional `showFor`.
- Profile state is one `activeTab` signal on `ProfileContext`.

Current card story:

```text
Meta -> Stats -> Rating -> News -> Momentum/Trends -> Sigil
```

Roster is not a profile card. Team roster discovery belongs to the hierarchy
surface at `/leaderboard?type=player&teamId=...`, where the backend can include
active roster members with null product data. Some UI labels may use `Trends`;
the product endpoint and internal product are `momentum`.

Old deep-link aliases should continue to resolve in `src/lib/utils/profile-tabs.ts`, including `composite -> stats`, `traits|specialist -> rating`, `vibes -> sigil`, `trends|starline -> momentum`, and `transfers|suitors -> news`.

## Leaderboard Composition

The leaderboard route is the ranked hierarchy surface, not a profile sub-tab.
It exposes sport -> league/conference -> division -> team -> player through URL
scope controls and product boards. Rating owns the full roster view when
`type=player&teamId=...`; News, Vibe, Momentum, Sigil, and Transfers/Trades are
scored projections over the same hierarchy.

Rows link into `/profile` at the relevant card tab. Do not reintroduce a
leaderboard-local entity database or a profile-local roster tab; the hierarchy
lives on leaderboard, the card detail lives on profile.

## Card Vocabulary

| Concept | Component | Role |
|---|---|---|
| Vessel primitive | `Shell` | Chrome only: border, tarot corners, corner label/dot slot. |
| Rail primitive | `NavRail` | Shared selection rail for tabs, segmented navigation, and scoped control rows. |
| Rail composition | `NavRailStack` | Page-level item rail plus optional scoped-control rail. |
| Page layout container | `ContentShell` | Borderless profile composition. |
| Content unit | `*Card` | Self-contained data and render unit wrapped in a Shell. |

Every content surface is a card.

`Shell`, `NavRail`, and `NavRailStack` are pillar primitives and should not import flagship-specific concerns. Keep them extract-ready for a future shared UI package. `NavRail` unifies the rail posture across tabs and scopes, but it does not collapse their semantics: product switches render as item/tab rails; scopes and modes remain dropdown/select controls inside a control rail.

## Card Convention

Each card owns its body and product fetch. `Shell` owns chrome.

```tsx
export default function XCard() {
  const ctx = useProfile();
  const data = createAsync(...);

  return (
    <Show when={data()} fallback={<EmptyCard />}>
      <Shell as="article" aria-label="X">
        {/* card body */}
      </Shell>
    </Show>
  );
}

export function XCardSkeleton() {
  return <Shell as="article" aria-label="X">...</Shell>;
}
```

Skeleton named exports should use the same Shell shape as the resolved card. Empty states should use `EmptyCard` for a consistent null-state silhouette.

## Data Layer

All async data should follow:

```text
createAsync(() => getProduct(...))
```

where `getProduct` is a `query()`-wrapped fetcher.

- API data lives in `src/lib/data/*.server.ts` with function-level `"use server"`.
- Client-only data lives in `src/lib/data/*.ts` and must be gated on `!isServer` when necessary.
- Every card issues its fetch on mount. `ContentShell` renders every registry-visible pane from SSR through hydration, with pane-local Suspense/ErrorBoundary wrappers so one hidden product outage cannot replace active content. Keep crawler-critical route identity useful, and keep non-critical warmup on the hydrated user path.
- `query()` deduplicates by function name and args, so multiple cards reading the same product should collapse to one request.

Rule:

```text
one card -> one product -> one endpoint
```

Do not merge across products on the client. Do not fetch third-party feeds from the client.

## Sharing

Share is not a Shell concern. Shareable cards compose `ShareTrigger` as a sibling inside the Shell body.

The browser share action sends title, text, and canonical URL. It does not attach a client-generated image. Share targets render the OG image from the URL's `og:image`, served by the `/og/...` route.

Browsers without Web Share API support use `ShareFallbackModal`.

The intended direction is uniform card shareability through a project-side wrapper, not by pushing share behavior into the pillar Shell.

## Constraints

- Prefer SolidStart SSR. Use browser-only wrappers only when a component truly cannot render on the server.
- Pull shared visual values from `@scoracle/tokens`; do not redefine token values in local CSS.
- Do not create a fake `@scoracle/ui` dependency. Shared primitives live inline here until an extraction happens by deliberate `git mv`.
- Do not break the pillar/feature boundary. Structural primitives stay structural; product composition belongs in project-side components.
