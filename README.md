# scoracle-frontend

Flagship client-facing web app for `scoracle.com`: SolidStart 2.0 alpha, Solid 1.9.11, TypeScript, and Cloudflare Workers.

## Start Here

Before working in this repo, read these in order:

1. This README
2. [../scoracle-wiki/PRODUCT_NARRATIVE.md](../scoracle-wiki/PRODUCT_NARRATIVE.md)
3. [../scoracle-tokens/AESTHETIC_VISION.md](../scoracle-tokens/AESTHETIC_VISION.md)

The wiki owns product direction. The tokens repo owns the shared visual doctrine. This repo owns the web implementation.

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
- Owns: the production web experience, SSR streaming, card composition, web routing, web data fetchers, OG/share surfaces, and Cloudflare Worker deployment.
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
6. Add a local progress doc in `progress_docs/YYYY-MM-DD_short-description.md`.
7. If the change is a product, data-contract, aesthetic, or architecture landmark, also add a progress doc in `../scoracle-wiki/progress_docs/`.
8. If the change introduces shared vocabulary or a landmark shift, update `../scoracle-wiki/wiki/Glossary.md` or `../scoracle-wiki/wiki/Changelog.md`.
9. Run verification.
10. Commit and push.
11. For unfinished multi-step work, leave a copyable handoff.

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
npm run dev          # Vite dev server, default port 3000
npm run typecheck    # TypeScript check
npm test             # Vitest
npm run build        # Cloudflare Workers build output in .output/
npm run cf:deploy    # Build and deploy with Wrangler
```

## Architecture

The app is SSR-streamed through SolidStart on Cloudflare Workers. Route data flows through `createAsync` and `query()` wrappers against Scoracle's own backend at `api.scoracle.com`.

Profile pages are card-first:

```text
Meta -> Stats -> Rating -> News -> Momentum -> Sigil
```

Team profiles also include Roster. Each card owns its product fetch and renders independently. Navigation changes visibility; it should not gate fetching or create passthrough data dependencies.

Key primitives:

- `Shell` owns chrome and card silhouette.
- `NavStrip` owns tab/segmented navigation.
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

## Progress Docs

New work uses:

```text
progress_docs/YYYY-MM-DD_short-description.md
```

Historical progress lives in `docs/progress/`; leave it intact unless a migration is explicitly requested.

Suggested format:

```md
# YYYY-MM-DD - <Title>

## Goal

## What Changed

## Files Changed

## Verification

## Result

## Follow-Up
```

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
