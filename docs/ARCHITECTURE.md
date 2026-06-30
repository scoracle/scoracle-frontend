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

Every route is SSR-streamed. The shell renders synchronously and each Suspense boundary streams as its `createAsync` resources resolve. There is no prerender step.

Server-side fetches use function-level `"use server"` directives in `src/lib/data/*.server.ts`.

`ContentShell` owns each card Suspense boundary and passes the card's named skeleton as fallback. Suspensions should not bubble past `ContentShell` to the route root.

## Profile Composition

The profile route renders `EntityMeta` plus `ContentShell`.

- `EntityMeta` is the meta display widget. It reads sport/type/id from `ProfileContext`, has no UI state, and publishes the entity ID into its Shell corner slot through `useShell()`.
- `ContentShell` is a borderless layout section. It stacks a Shell containing `NavStrip` above the card panes.
- `CARD_REGISTRY` in `src/components/solid/card-registry.tsx` is the source of truth for profile tabs and order. Each entry co-locates `id`, `label`, body component, fallback skeleton, and optional `showFor`.
- Profile state is one `activeTab` signal on `ProfileContext`.

Current card story:

```text
Meta -> Stats -> Rating -> News -> Momentum/Trends -> Sigil
```

Teams also include Roster. Some UI labels may use `Trends`; the product endpoint and internal product are `momentum`.

Old deep-link aliases should continue to resolve in `src/lib/utils/profile-tabs.ts`, including `composite -> stats`, `traits|specialist -> rating`, `vibes -> sigil`, `trends|starline -> momentum`, and `transfers|suitors -> news`.

## Card Vocabulary

| Concept | Component | Role |
|---|---|---|
| Vessel primitive | `Shell` | Chrome only: border, tarot corners, corner label/dot slot. |
| Nav primitive | `NavStrip` | Tab or segmented navigation. |
| Page layout container | `ContentShell` | Borderless profile composition. |
| Content unit | `*Card` | Self-contained data and render unit wrapped in a Shell. |

Every content surface is a card.

`Shell` and `NavStrip` are pillar primitives and should not import flagship-specific concerns. Keep them extract-ready for a future shared UI package.

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
- Every card issues its fetch on mount. `ContentShell` mounts all profile cards eagerly so product reads fan out in parallel.
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

- No `client:only` thinking from Astro. Use SolidStart streaming and `clientOnly` only where genuinely needed.
- Pull shared visual values from `@scoracle/tokens`; do not redefine token values in local CSS.
- Do not create a fake `@scoracle/ui` dependency. Shared primitives live inline here until an extraction happens by deliberate `git mv`.
- Do not break the pillar/feature boundary. Structural primitives stay structural; product composition belongs in project-side components.
