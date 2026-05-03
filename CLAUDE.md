# CLAUDE.md — scoracle-frontend

Flagship for `scoracle.com`. **SolidStart 2.0-alpha + Solid 1.9.11** on Cloudflare Workers. **Live at `scoracle.com` since the 2026-05-03 DNS cutover.** Replaced the legacy `albapepper/Scoracle` (Astro 6) frontend; the legacy Astro worker is parked on its own subdomain as a hot standby during the soak period.

## Multi-directory session pattern

Sessions run with three roots:

```bash
cd ~/scoracle-frontend
claude --add-dir ~/scoracleWiki --add-dir ~/Scoracle
```

- `~/scoracle-frontend` (cwd, this repo) — the live flagship; where work lands
- `~/scoracleWiki` (vault) — vision, architecture, design principles
- `~/Scoracle` (legacy Astro repo) — historical code archive. **Read-only.** Useful for spot-checking patterns from the pre-cutover era; not modified.

`.claude/settings.json` sets `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` so each `--add-dir`'s CLAUDE.md is auto-folded into context.

## Design principles (locked)

1. **Single profile page.** All entity views behind tabs on one route.
2. **Islands own their data.** Each component is self-sufficient, fetches its own data via `createAsync` + `query()` against the unified data layer.
3. **Lazy-load, sticky-after.** TabContainer mounts the default tab; other tabs mount on first activation, then stay in the DOM (CSS `display: none` toggle on inactive). No remount, no flicker on revisit.
4. **Snappy at every stage.** Bundled JSON for zero-latency autocomplete; route `preload` + onMount `firePreloads` warm every tab's `query()` cache before clicks land; SSR streaming for cold loads.

**Pillars: snappiness + simplicity over cleverness.** Reach for the obvious option before the clever one.

See `~/scoracleWiki/wiki/Architecture/Frontend Architecture.md` and `~/scoracleWiki/wiki/Architecture/Component Strategy.md` for the architectural narrative.

## Stack

- SolidStart 2.0.0-alpha.2 (DeVinxi rewrite — pure Vite, no Vinxi, no `app.config.ts`)
- Solid 1.9.11 (pinned exact)
- TypeScript strict
- Cloudflare Workers via a hand-rolled h3 shim (`worker.ts`, ~30 lines using `h3/cloudflare`'s `toWebHandler`). The Vinxi-era `cloudflare-module` preset was dropped in the DeVinxi rewrite; the Nitro v3 integration that will eventually replace this shim lands after SolidStart 2.0 stable.
- `@scoracle/tokens` — design tokens (CSS custom properties only)
- `@solidjs/router` — client-side navigation, `createAsync`, `query()`
- `nanostores` + `@nanostores/solid` — cross-component reactive state (e.g., `$entityInfo` for document.title)
- Native CSS + custom properties (no Tailwind, no CSS-in-JS)

## Path aliases

```
@/*           → src/*
@components/* → src/components/*
@layouts/*    → src/layouts/*
@lib/*        → src/lib/*
@pages/*      → src/routes/*    (note: routes, not pages — SolidStart convention)
```

## Rendering mode

Every route is **SSR-streamed**. The shell renders synchronously; each `<Suspense>` boundary streams its content as the underlying `createAsync` resources resolve. There is no prerender step. Server-side fetches execute on Cloudflare Workers via `"use server"` function-level directives in `src/lib/data/*.server.ts`.

Per-tab streaming: TabContainer owns each tab's `<Suspense>` (with the per-tab `fallback` from `TabDef.fallback`). This catches both data-load suspensions and any reactive-scope quirks from createMemos in tab bodies — no suspension can bubble past TabContainer to the route's root `<Suspense>`.

## Profile page architecture

The profile route renders `<EntityMeta />` + `<ProfileCard />`:

- **`EntityMeta`** — pure meta-display widget; reads sport/type/id from `ProfileContext`; no UI state.
- **`ProfileCard`** — single parent card (the only flagship-specific composition for the profile page). Owns the `card` visual, the 600px max-width, and a "News / Stats" mode toggle at the top. Two `<TabContainer>` instances stacked, both always mounted, CSS hide for the inactive mode → mode toggle is a class flip with zero remount, zero flicker.
- **News-mode tabs:** News / X / Vibes (Co-mentions disconnected; CoMentionsTab.tsx + getEntities query preserved for future re-enabling — one-line change in newsTabs and firePreloads).
- **Stats-mode tabs:** Stats / Traits / Compare.

`<TabContainer>` is a pure structural pillar primitive (`.tabs-root`, no card visual, no max-width, no `class?` prop). When `@scoracle/ui` extracts (when sandbox lands), TabContainer moves cleanly; ProfileCard stays as a flagship-specific feature-repo composition.

## Tab convention

Every tab file follows one shape:

```tsx
export default function XTab() {
  const ctx = useProfile();
  const data = createAsync(...);
  // optional: createMemos, signals, helpers
  return <Show when={...}>...</Show>;
}

export function XTabSkeleton() {
  return <div class="tab-loading-skeleton">...</div>;
}
```

The default export is just data + render — no internal `<Suspense>`, no outer wrapper `<div>` whose only purpose is to host one. The named-export skeleton is wired in via `TabDef.fallback` in the parent card composition (ProfileCard).

## Data layer

All async data flows through one shape: `createAsync(() => getX(...))` against a `query()`-wrapped fetcher.

- **Server-fns** (`src/lib/data/*.server.ts`) for API data. Function-level `"use server"` directive (not module-level — TanStack server-functions plugin in alpha.2).
- **Client-only queries** (`src/lib/data/*.ts`) for bundled-JSON / client-only data. Gated on `!isServer`. Examples: `sport-meta.ts`, `entities.ts`.

The route's `firePreloads` calls every tab's query on profile mount (and on hover via the route `preload` export). By the time the user clicks any tab, its data is in flight or warm in `query()`'s cache.

## Constraints

- **Don't modify `~/Scoracle`.** It's a read-only legacy archive — historical reference for patterns. Modifications go in `scoracle-frontend`.
- **No `client:only` thinking** — that's an Astro directive. Use SolidStart per-route streaming + `clientOnly` HOC only where genuinely needed.
- **Pull tokens from `@scoracle/tokens`.** Don't redefine in this repo's CSS.
- **`@scoracle/ui` does not exist yet.** Pillar primitives (Skeleton, TabContainer, Header, Footer) live inline here, **extract-ready** — no flagship-specific imports inside them. They migrate to `@scoracle/ui` via `git mv` when sandbox kicks off.
- **Don't break the pillar/feature seam.** TabContainer is purely structural; visual + composition concerns belong in project-side components (ProfileCard, future LineupCard, etc).

## Per-commit progress docs

Solo project (Scott / `albapepper` is sole owner and sole developer), commits go to `main` directly — no PR review gate. **Every commit produces a progress doc, in two locations:**

- `docs/progress/YYYY-MM-DD_short-description.md` (this repo, version-controlled, ships with the commit)
- `~/scoracleWiki/Progress/scoracle-frontend/YYYY-MM-DD_short-description.md` (vault mirror)

Format: `Goal` / `What Was Done` / `Files Changed` / `Verification` / `Result`. One page max. Trivial commits still get a doc; a single paragraph is fine.

Why both: the in-repo copy is canonical and ships with the codebase; the vault mirror keeps work history reachable from any machine without cloning every repo, and integrates with the cross-repo planning surface in `~/scoracleWiki/`.

Write the progress doc as the **final step** of the change — after staging the code, before `git commit`. Stage the doc with the commit so it lands together.

## Quick reference

```bash
# Prereq: GitHub PAT with read:packages, exported as NODE_AUTH_TOKEN
export NODE_AUTH_TOKEN=<your-pat>
npm install

npm run dev              # Vite dev server
npm run build            # Build for Cloudflare Workers (.output/)
npm run typecheck        # tsc --noEmit
npm test                 # Vitest (currently 67 tests)
npm run cf:deploy        # wrangler deploy
```

Requires Node 22.12+.

**Production:** `https://scoracle.com` (custom domain on the `scoracle-frontend` Cloudflare Worker). Backup URL: `https://scoracle-frontend.albapepper.workers.dev`.
