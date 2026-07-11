# scoracle-frontend

Flagship client-facing web app for `scoracle.com`: SolidStart 2.0 alpha, Solid 1.9.11, TypeScript, and Cloudflare Workers.

## Start Here

Before working in this repo, read these in order:

1. This README
2. [../scoracle-wiki/PRODUCT_NARRATIVE.md](../scoracle-wiki/PRODUCT_NARRATIVE.md)
3. [../scoracle-tokens/AESTHETIC_VISION.md](../scoracle-tokens/AESTHETIC_VISION.md)

The wiki owns product direction. The tokens repo owns the shared visual doctrine. This repo owns the web implementation.

Every session in this client-facing repo must be aware of `../scoracle-wiki`.
The wiki is the product authority for narrative, shared vocabulary, changelog
landmarks, and cross-repo context; do not treat it as optional background.

## Architecture Philosophy

Scoracle should feel durable and server-shaped first, with precise client
reactivity where the product needs it. SolidStart owns full-document SSR;
Solid owns the focused interactive surfaces.

One rendering contract: every request — user or crawler — receives the same
fully server-rendered HTML (async SSR awaits all data before the flush), then
hydrates. There is no UA sniffing, no render mode, no crawler-special path
anywhere in this codebase; keeping it that way is a hard rule. Data flows
exclusively through server `query()` functions read by `createAsync` — query()
owns caching and dedup, so no warm passes or bespoke client caches exist.

## Shared Organization Docs

Shared process, vocabulary, and history live in `scoracle-wiki`, not this repo:

- [../scoracle-wiki/wiki/CONVENTIONS.md](../scoracle-wiki/wiki/CONVENTIONS.md) - how shared docs, progress, glossary entries, and changelog entries are organized.
- [../scoracle-wiki/wiki/Glossary.md](../scoracle-wiki/wiki/Glossary.md) - cross-repo product and architecture vocabulary.
- [../scoracle-wiki/wiki/Changelog.md](../scoracle-wiki/wiki/Changelog.md) - landmark architecture and product shifts.

Use those docs when adding shared language, recording landmarks, or checking historical context. Keep web-only implementation detail in this README or [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Pillars

Scoracle is lean, nimble, and durable.

Elegance comes through simplicity. Simple and durable beats clever and fragile. The flow of information must be clear and clean.

Our role is to eliminate noise around entities and divine the facts. Frontend code should preserve that clarity: consume clean products, avoid hidden derivation, and serve the model's value through an elegant UI.

## Repo Role

- Type: `frontend/client-facing`
- Owns: the production web experience, SolidStart SSR, card composition, web routing, web data fetchers, the copy-the-card artifact, and Cloudflare Worker deployment.
- Does not own: product doctrine, visual doctrine, backend derivation, API truth, or token definitions.
- Primary consumers: Scoracle users on `scoracle.com`.

## Session Workflow

1. Read this README.
2. Sync safely:

```bash
git fetch
git status --short --branch
```

Pull only when the working tree is clean and the branch has not diverged.

3. Read [../scoracle-wiki/PRODUCT_NARRATIVE.md](../scoracle-wiki/PRODUCT_NARRATIVE.md).
4. Read [../scoracle-tokens/AESTHETIC_VISION.md](../scoracle-tokens/AESTHETIC_VISION.md).
5. Perform the task in the smallest useful chunk.
6. If the change is a product, data-contract, aesthetic, or architecture landmark, add a progress doc in `../scoracle-wiki/progress_docs/` and update `../scoracle-wiki/wiki/Glossary.md` or `../scoracle-wiki/wiki/Changelog.md` as needed.
7. Run verification (`npm run typecheck && npm test`, plus `npm run cf:build && npm run verify:ssr` for anything touching SSR or data flow).
8. Commit and push.
9. For unfinished multi-step work, leave a copyable handoff.

## Working Context

Keep context narrow. Most web tasks need only:

```text
scoracle-frontend/
../scoracle-wiki/
../scoracle-tokens/
```

Add `../scoracle-backend/` only for endpoint contract or payload-shape work. Do not load the full org by default.

## Setup

Requires Node 22.12+ and a GitHub PAT with `read:packages` scope.

```bash
export NODE_AUTH_TOKEN=<your-pat>
npm install
```

## Commands

```bash
npm run dev          # Vite dev server (port 5173)
npm run typecheck    # TypeScript check
npm test             # Vitest
npm run cf:build     # Production build (dist/client + dist/server)
npm run verify:ssr   # Render /, /leaderboard, /profile from the build; assert
                     # full SSR content, identical for browser and crawler UAs
npm run cf:deploy    # cf:build + wrangler deploy
npm run fetch-data   # Refresh bundled entity JSON in public/data/
```

## Architecture

The app renders through SolidStart on Cloudflare Workers using async full-document SSR. Route-critical data flows through `createAsync` and `query()` wrappers against Scoracle's own backend at `api.scoracle.com`. Every card mounts eagerly through SSR; tabs and controls change visibility, not whether products exist.

Surface ownership is a product pillar:

- `/leaderboard` exposes hierarchy and ranked discovery: sport -> league/conference -> division -> team -> player.
- `/profile` surfaces cards for one selected entity.
- Roster discovery is a team-scoped player leaderboard, not a profile card.

Profile pages are card-first:

```text
Meta -> Stats -> Rating -> News -> Momentum -> Sigil
```

Roster discovery lives on `/leaderboard` as a team-scoped player board. Each profile card owns its product fetch and renders independently. Navigation changes visibility; it should not gate fetching or create passthrough data dependencies.

Key primitives:

- `Shell` owns chrome and card silhouette.
- `NavRail` owns selection rails: product tabs, sport selectors, board rails, and child-composed scope/control rows.
- `NavRailStack` composes an item rail plus an optional scoped-control rail for profile and leaderboard pages.
- `ContentShell` composes profile navigation and card panes.
- `CARD_REGISTRY` is the source of truth for profile tab order and card mounting.

Detailed repo-local architecture rules live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Data Boundary

The frontend consumes precomputed products from the backend. It should not call third-party data providers, scrape feeds, invoke models, or reconstruct Scoracle products from raw ingredients.

Use one fetcher per product:

```text
one card -> one get<Product>() -> one backend endpoint -> one render
```

Canonical product model: [../scoracle-wiki/PRODUCT_NARRATIVE.md](../scoracle-wiki/PRODUCT_NARRATIVE.md).

## Aesthetic Contract

The visual north star is [../scoracle-tokens/AESTHETIC_VISION.md](../scoracle-tokens/AESTHETIC_VISION.md).

Use `@scoracle/tokens` for shared color, type, and asset values. Do not redefine token values in local CSS. The web can own layout and platform-specific interaction, but shared visual doctrine belongs in `scoracle-tokens`.

Reuse brand primitives before creating surface-specific controls. When two controls express the same product idea across cards, scopes, tabs, modes, or repos, prefer extending the shared primitive and token vocabulary over creating a new local component. Local components may own platform behavior, but the naming, posture, and visual doctrine should converge through `scoracle-tokens`.

For selection surfaces, use `NavRail` as the shared brand primitive. Product tabs and sport/board selectors render as item rails; scopes, seasons, modes, compare, search, and mixed controls compose inside control rails. Keep the semantics distinct even when the visual language is shared: product switches are tabs/segmented item rails, while scopes remain dropdown/select controls inside the rail.

## Handoff Format

For unfinished multi-step work, end with:

```text
Continue work in scoracle-frontend on branch <branch>.

Read first:
1. README.md
2. ../scoracle-wiki/PRODUCT_NARRATIVE.md
3. ../scoracle-tokens/AESTHETIC_VISION.md

Last completed:
- <summary>

Changed files:
- <files>

Verification run:
- <commands/results>

Next task:
- <specific next step>

Known risks:
- <risks or none>
```

## Production

- Primary: `https://scoracle.com`
- Worker backup: `https://scoracle-frontend.albapepper.workers.dev`
