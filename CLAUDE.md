# CLAUDE.md — scoracle-frontend

Greenfield flagship for `scoracle.com`. **SolidStart 2.0-alpha + Solid 1.9.11** on Cloudflare Workers. Replaces `albapepper/Scoracle` (Astro 6) at DNS cutover.

## Multi-directory session pattern

Sessions run with three roots:

```bash
cd ~/scoracle-frontend
claude --add-dir ~/scoracleWiki --add-dir ~/Scoracle
```

- `~/scoracle-frontend` (cwd, this repo) — where work lands
- `~/scoracleWiki` (vault) — vision, architecture, design principles
- `~/Scoracle` (Astro repo) — port-source for components, types, fetch logic. **Read-only.**

`.claude/settings.json` sets `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` so each `--add-dir`'s CLAUDE.md is auto-folded into context.

## Design principles (locked)

1. **Single profile page.** All entity views behind tabs on one route.
2. **Islands own their data.** Each component is self-sufficient, fetches its own data via reactive resources.
3. **Lazy-load everything else.** Tabs activate-load via `isActive` render prop; heavy modules import on demand.
4. **Snappy at every stage.** Bundled JSON for zero-latency autocomplete; SWR caching; instant local meta hydration.

**Pillars: snappiness + simplicity over cleverness.** Reach for the obvious option before the clever one.

See `~/scoracleWiki/wiki/Architecture/Frontend Architecture.md` for full context.

## Stack

- SolidStart 2.0-alpha.2 (DeVinxi rewrite — pure Vite, no Vinxi)
- Solid 1.9.11 (pinned exact)
- TypeScript strict
- Cloudflare Workers via SolidStart's `cloudflare-module` preset
- `@scoracle/tokens` — design tokens (CSS custom properties only)
- `@solidjs/router` — client-side navigation
- `solid-transition-group` — strictly in-component animation (e.g., carousel), not page-level
- `nanostores` + `@nanostores/solid` — cross-component reactive state
- Native CSS + custom properties (no Tailwind, no CSS-in-JS)

## Path aliases

```
@/*           → src/*
@components/* → src/components/*
@layouts/*    → src/layouts/*
@lib/*        → src/lib/*
@pages/*      → src/routes/*    (note: routes, not pages — SolidStart convention)
```

## Per-route rendering mode

SolidStart picks rendering mode per route. The intended split:

- **Static (prerender)**: `/`, `/profile`, `/404` — same as the Astro era, edge-cached
- **CSR**: live tabs (news, vibe, etc.) where feel matters most
- **SSR**: reserved for SEO-sensitive routes if/when SEO comes back into scope

`app.config.ts > server.prerender.routes` controls the static set.

## Component port — source of truth

When porting from `~/Scoracle`, **read `~/Scoracle/src/components/solid/` fresh.** The Astro repo's `CLAUDE.md` is stale on inventory. Per the 2026-04-19 changelog:

- `SimilarityTab` is gone — replaced by user-driven **Compare** flow
- An **X tab** lives in NewsCard alongside News and Co-mentions
- Pizza charts are locked to a fixed **four-slot grid** (Attack / Possession / Defense / Discipline)

The legacy `ComparisonSearchModal.astro` triad and `component-bus.ts` are dropped — the new Compare flow is the canonical comparison path.

## Constraints

- **Don't modify `~/Scoracle`.** It's a port-source, frozen until DNS cutover.
- **No `client:only` thinking** — that's an Astro directive. Use SolidStart per-route mode + `clientOnly` HOC where genuinely needed.
- **Pull tokens from `@scoracle/tokens`.** Don't redefine in this repo's CSS.
- **`@scoracle/ui` does not exist yet.** Components live inline here until `scoracle-sandbox` needs them. Don't preemptively factor.
- **Bundle-size budget**: within 15% of the Astro `dist/_astro/` baseline (capture before serious porting starts).

## Per-commit progress docs

This is a solo project (Scott / `albapepper` is sole owner and sole developer) and the repo is greenfield, so commits go to `main` directly — no PR review gate. **Every commit produces a progress doc, in two locations:**

- `docs/progress/YYYY-MM-DD_short-description.md` (this repo, version-controlled, ships with the commit)
- `~/scoracleWiki/Progress/scoracle-frontend/YYYY-MM-DD_short-description.md` (vault mirror)

Format mirrors the Astro repo's template — `Goal` / `What Was Done` / `Files Changed` / `Verification` / `Result`. One page max. Trivial commits still get a doc; a single paragraph is fine.

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
npm run cf:deploy        # wrangler deploy
```

Requires Node 22.12+.
