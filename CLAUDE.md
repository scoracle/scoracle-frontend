# CLAUDE.md — scoracle-frontend

Flagship for `scoracle.com`. **SolidStart 2.0-alpha + Solid 1.9.11** on Cloudflare Workers. **Live at `scoracle.com` since the 2026-05-03 DNS cutover.**

## Session start: confirm branch is synced — ALWAYS step 1

**Before any editing, before any tool call beyond inspection, confirm the local branch is synced with `origin/main`.** Run `git fetch && git status`, and if uncertain about divergence, compare `git log origin/main..HEAD` (local-only) and `git log HEAD..origin/main` (remote-only). If the branch has diverged in either direction — even by a single commit — surface it to the user and confirm the plan before editing.

Why this is non-negotiable: scoracle is a solo + multi-machine project (arch laptop + archbox). Work moves between machines and gets pushed to `origin` from whichever machine made it. Starting a session on a stale local baseline burns time on duplicate work and forces cleanup merges that could have been a single pull. The check costs one second; skipping it costs an hour.

## Multi-directory session pattern

All scoracle org repos live under `~/scoracle/` (one parent dir per the 2026-05-19 consolidation). `~/scoracleWiki` is the Obsidian planning vault — **not** a git repo, **not** the same as `scoracle/scoracle-wiki` (which is the curated org milestone log, locally at `~/scoracle/scoracle-wiki`).

Sessions run with two roots:

```bash
cd ~/scoracle/scoracle-frontend
claude --add-dir ~/scoracleWiki
```

- `~/scoracle/scoracle-frontend` (cwd, this repo) — the live flagship; where work lands
- `~/scoracleWiki` (Obsidian vault) — vision, architecture, design principles, cross-repo planning

Sibling repos at `~/scoracle/scoracle-backend`, `~/scoracle/scoracle-tokens`, `~/scoracle/scoracle-wiki` are available when needed — add them with `--add-dir` for the session if a task spans repos. `CDPATH=.:~/scoracle` in `~/.bashrc` means `cd scoracle-backend` works from anywhere.

`.claude/settings.json` sets `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` so each `--add-dir`'s CLAUDE.md is auto-folded into context.

New machine? Run `~/scoracleWiki/bootstrap.sh` — it creates `~/scoracle/`, clones every org repo, and appends the CDPATH line to `~/.bashrc`. See `~/scoracleWiki/Setup.md` for the full procedure.

## Design principles (locked)

1. **Single profile page.** All entity views behind tabs on one route.
2. **Cards own their data — end-to-end, no passthrough.** Each Card is self-sufficient: it fetches its own *product* via `createAsync` + `query()` against **our own** backend (`api.scoracle.com`). Every endpoint is a precomputed read we control — there are **no third-party calls** (X/Twitter, Google RSS) rendered on read. The compile→scrub→derive happens in the backend pipeline; the client only ever consumes finished products.
3. **Eager-load — every Card, immediately.** ContentShell mounts **all** Cards on profile open; each fetches its product right away and renders as received. No tab-gated mounting, no sticky-mount, no lazy deferral — now that every product is a fast precomputed read we own (no slow passthrough to hide behind), there is nothing to defer. NavStrip selects which mounted Card is *visible* (a CSS toggle); it is **not** a fetch gate.
4. **Snappy at every stage.** Bundled JSON for zero-latency autocomplete; eager per-Card fetches served from SWR-cached precomputed reads (stale served instantly, revalidated in the background); SSR streaming for cold loads.

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

Per-Card streaming: ContentShell owns each Card's `<Suspense>` (with the Card's named skeleton wired in as the fallback). This catches both data-load suspensions and any reactive-scope quirks from createMemos in Card bodies — no suspension can bubble past ContentShell to the route's root `<Suspense>`.

## Profile page architecture

The profile route renders **MetaShell + ContentShell**.

- **`EntityMeta`** (MetaShell) — pure meta-display widget; wraps its body in a locked `<Shell>`. Reads sport/type/id from `ProfileContext`; no UI state. Publishes the entity ID into its own Shell's corner slot via `useShell()`.
- **`ContentShell`** — borderless layout container (a plain `<section>`, no chrome). Stacks a `<Shell>` holding a single `<NavStrip>` strip (player tabs: **Stats / Rating / News / Trends / Sigil**; teams add **Roster**, gated via `showFor`) and the Card panes. All Cards mount **eagerly** on profile open and fetch their product immediately; NavStrip toggles which mounted Card is *visible* (a CSS flip — zero remount, zero flicker), it does not gate fetching. The convergence surfaces (Rating / Vibe / Momentum / Sigil — see `~/scoracleWiki/wiki/Sigil.md` + Product Narrative): **Stats** (default tab — the composite datapoint pizza, fed by `getStats().rating.rating_breakdown`), **Rating** (Gemma's stat read: the divined peak-skill hero + composite magnitude score + identity blurb), **Sigil** (the crown — the three-signal holistic synthesis, tarot + archetypes), **Trends** (the internal id is `momentum` — the unified rating+vibe season sparkline), and **News** (narratives + a Transfers scope dropdown, since standalone Transfers folded into News). Old deep-links alias forward in `profile-tabs.ts`: `composite→stats`, `traits|specialist→rating`, `vibes→sigil`, `trends|starline→momentum`, `transfers|suitors→news`, `compare|leaderboard→stats`. Leaders moved to the dedicated `/leaderboard` page; the old `?vs=<id>` compare param is inert (compare is a deferred follow-on on Stats).
- **Profile state** is a single `activeTab` signal on `ProfileContext`. No mode, no sub-tabs. CoMentionsCard.tsx is disconnected; getEntities query preserved for future re-enabling — one registry entry.
- **`CARD_REGISTRY` (`components/solid/card-registry.tsx`) is the single source of truth for tabs** — the array order IS the on-screen tab order. Each entry co-locates `{ id, label, body (Card), fallback (skeleton), showFor? }`. ContentShell derives the NavStrip items + panes from it (filtered by `showFor`) and **mounts every Card eagerly** on profile open, so each Card fetches its own product on mount. **Adding a tab = one `CARD_REGISTRY` entry** (the `CardId`/`ProfileTab` unions + `deriveInitialTab` aliases in `lib/utils/profile-tabs.ts` round it out).

### Vocabulary (locked 2026-05-14)

| Concept | Component | Role |
|---|---|---|
| Vessel primitive | `<Shell>` | chrome only (border, tarot corners, ID/numeral/dot slot) — share is composed in via a sibling `<ShareTrigger>`, never a Shell prop. **One canonical shape**: a 380×320 landscape floor (`min-height`) that grows to fit taller content. No height props. |
| Nav primitive | `<NavStrip>` | tab-strip; standalone + `inline` variants. Used for the profile tabs (5 player / 6 team destinations, registry-driven via `CARD_REGISTRY`), the home-page sport row, and inline rate/scope toggles. |
| Page layout container | `<ContentShell>` | borderless section that stacks the profile-nav Shell + active Card's Shell |
| Content unit | `<*Card>` | self-contained data + render; wraps its body in a `<Shell>` |

Every content surface is a **Card**.

`<Shell>` and `<NavStrip>` are pillar primitives — no flagship-specific imports inside them, **extract-ready** for `@scoracle/ui` via a one-step `git mv` when sandbox lands.

## Card convention

Every Card file follows one shape:

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
  return <Shell as="article" aria-label="X">…</Shell>;
}
```

The Card owns its body; `<Shell>` owns the chrome. The shape is a 380×320 floor (`min-height`) — surfaces whose content is taller grow naturally, no opt-in needed. Share is NOT a Shell concern — shareable Cards render `<ShareTrigger>` (from `src/lib/share`) as a sibling inside their Shell body; it positions itself absolute top-right against the Shell's relative root:

```tsx
<Shell as="article" cornerLabel={archetype()?.numeral} aria-label="Sigil">
  <ShareTrigger
    metadata={{
      cardType: "sigil",
      entity: { sport, type, id },
      entityName: entityName(),
      tab: "sigil",
    }}
  />
  {cardBody()}
</Shell>
```

On click, `ShareTrigger` hands the post copy + canonical profile URL to `navigator.share({ title, text, url })`. **No image is generated or attached client-side** — the share target's crawler (X / FB / iMessage / Discord) renders the OG card from the URL's `og:image` meta, which points at the server-rendered `/og/...` route (`src/lib/og/*`, satori + `@resvg/resvg-wasm`). One image, sourced once by the crawler. Browsers without the Web Share API (Firefox desktop) fall back to `<ShareFallbackModal>` (open X / FB composer + copy link — each renders the same OG card from the link).

The earlier client-side approach — fetching the OG PNG and attaching it as a `File`, plus an html-to-image snapshot pipeline — was removed 2026-05-28: it produced a redundant second image (attached file *plus* the crawled card). `ShareButton` / `ShareModal` / `ShareFrame` / `html-to-image` no longer exist.

Today only the Sigil card opts in (it was the share test bed). The intended direction is **uniform sharability** — every Card shareable by default with a one-switch per-card opt-in. The clean seam is a flagship-side `<CardShell>` wrapper (`<Shell>` + optional `<ShareTrigger>`), NOT pushing share back into the pillar Shell; unplugged Cards just render no trigger. Per-category shareable Stats/Compare cards are the Phase-D follow-on (the `stats:{slot}` / `compare:{slot}` cardTypes + `/og/compare/…` route are scaffolding for it).

Skeleton named exports wrap their loading body in the same Shell shape as the resolved Card — no chrome blink at Suspense resolution.

Empty states use the shared `<EmptyCard message?="..." />` (which wraps itself in a locked `<Shell>`) — same null-state silhouette across every Card.

## Data layer

All async data flows through one shape: `createAsync(() => getX(...))` against a `query()`-wrapped fetcher.

- **Server-fns** (`src/lib/data/*.server.ts`) for API data. Function-level `"use server"` directive (not module-level — TanStack server-functions plugin in alpha.2).
- **Client-only queries** (`src/lib/data/*.ts`) for bundled-JSON / client-only data. Gated on `!isServer`. Examples: `sport-meta.ts`, `entities.ts`.

Eager loading: every Card issues its fetch on mount (its `createAsync` runs as ContentShell mounts the pane), so a profile open fans out all products in parallel and each Card renders independently as its own data arrives. `query()` dedups by `[fn-name, ...args]`, so multiple Cards reading the same product (e.g. several `getStats`) collapse to a single request.

**One Card → one product → one endpoint.** Each `get<Product>` hits exactly one backend route (`/{sport}/{type}/{id}/{product}`) — there is no client-side merge across products and no passthrough. The News card reads `getNews` (`/news`, the precomputed Gemma narratives, with Transfers as a scope); it does not fetch any third-party feed.

## Constraints

- **No `client:only` thinking** — that's an Astro directive. Use SolidStart per-route streaming + `clientOnly` HOC only where genuinely needed.
- **Pull tokens from `@scoracle/tokens`.** Don't redefine in this repo's CSS.
- **`@scoracle/ui` does not exist yet.** Pillar primitives (Shell, NavStrip, Skeleton, Header, Footer, PizzaChart, EmptyCard) live inline here, **extract-ready** — no flagship-specific imports inside them. They migrate to `@scoracle/ui` via `git mv` when sandbox kicks off.
- **Don't break the pillar/feature seam.** Shell + NavStrip are purely structural; visual + composition concerns (including share via `ShareTrigger`) belong in project-side components (ContentShell here, future card compositions in other sites).

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
npm test                 # Vitest (currently 102 tests)
npm run cf:deploy        # wrangler deploy
```

Requires Node 22.12+.

**Production:** `https://scoracle.com` (custom domain on the `scoracle-frontend` Cloudflare Worker). Backup URL: `https://scoracle-frontend.albapepper.workers.dev`.
