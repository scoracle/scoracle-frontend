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
2. **Islands own their data.** Each Card is self-sufficient, fetches its own data via `createAsync` + `query()` against the unified data layer.
3. **Lazy-load, sticky-after.** ContentShell mounts the default Card; other Cards mount on first activation, then stay in the DOM (CSS `display: none` toggle on inactive). No remount, no flicker on revisit.
4. **Snappy at every stage.** Bundled JSON for zero-latency autocomplete; route `preload` + onMount `firePreloads` warm every Card's `query()` cache before clicks land; SSR streaming for cold loads.

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
- **`ContentShell`** — borderless layout container (a plain `<section>`, no chrome). Stacks two things: an unlocked-height `<Shell>` holding a single `<NavTabs>` strip (six siblings: Articles / X / Vibes / Stats / Traits / Compare), and the active Card pane. All Cards are sticky-mounted — the first activation runs setup, subsequent switches are a CSS flip with zero remount, zero flicker.
- **Profile state** is a single `activeTab` signal on `ProfileContext`. No mode, no sub-tabs. CoMentionsCard.tsx is disconnected; getEntities query preserved for future re-enabling — one-line wiring in `PANES` + `firePreloads`.

### Vocabulary (locked 2026-05-14)

| Concept | Component | Role |
|---|---|---|
| Vessel primitive | `<Shell>` | chrome (border, tarot corners, ID/numeral/dot slot) + share apparatus when `share={…}` is passed. **One canonical shape** (380×320 landscape); **one boolean opt-out** (`unlockHeight`) for content-driven height surfaces. |
| Nav primitive | `<NavTabs>` | tab-strip; one variant. Used on the profile page (6 destinations) and the home page (sport row). |
| Page layout container | `<ContentShell>` | borderless section that stacks the profile-nav Shell + active Card's Shell |
| Content unit | `<*Card>` | self-contained data + render; wraps its body in a `<Shell>` |

Every content surface is a **Card**.

`<Shell>` and `<NavTabs>` are pillar primitives — no flagship-specific imports inside them, **extract-ready** for `@scoracle/ui` via a one-step `git mv` when sandbox lands.

## Card convention

Every Card file follows one shape:

```tsx
export default function XCard() {
  const ctx = useProfile();
  const data = createAsync(...);
  return (
    <Show when={data()} fallback={<EmptyCard />}>
      <Shell as="article" unlockHeight aria-label="X">
        {/* card body */}
      </Shell>
    </Show>
  );
}

export function XCardSkeleton() {
  return <Shell as="article" unlockHeight aria-label="X">…</Shell>;
}
```

The Card owns its body; `<Shell>` owns the chrome. Default shape is locked 380×320 — surfaces whose content can't fit pass `unlockHeight`. Shareable Cards pass a single `share` metadata object:

```tsx
<Shell
  cornerLabel={archetype()?.numeral}
  share={{
    cardType: "vibe",
    entity: { sport, type, id },
    tab: "vibes",
    name: entity()?.name ?? "Scoracle",
    text: shareText(),
    primary: { imageUrl: entity()?.imageUrl ?? "", context: entity()?.context ?? "" },
    computedAt: vibe()?.generated_at,
  }}
>
  {cardBody()}
</Shell>
```

When `share` is set, Shell renders the share button (top-right, absolute), mounts the modal on click, builds the preview, and runs the snapshot pipeline. **Cards never import `ShareButton` / `ShareModal` / `ShareFrame` / `html-to-image` / `buildShareUrl`.** Add a new shareable Card → write the body, write the `share` metadata, hand it to Shell. Three properties to fill in.

Today only VibeCard is shareable. Stats and Compare drop their share temporarily until Phase D splits them into per-category child cards (each locked, each shareable).

Skeleton named exports wrap their loading body in the same Shell shape as the resolved Card — no chrome blink at Suspense resolution.

Empty states use the shared `<EmptyCard message?="..." />` (which wraps itself in a locked `<Shell>`) — same null-state silhouette across every Card.

**Card body idempotence:** when `share` is supplied, Shell renders `props.children` twice (once in-app, once in the modal preview). Render functions must read signals freely but must not write them — verified for all current Cards.

## Data layer

All async data flows through one shape: `createAsync(() => getX(...))` against a `query()`-wrapped fetcher.

- **Server-fns** (`src/lib/data/*.server.ts`) for API data. Function-level `"use server"` directive (not module-level — TanStack server-functions plugin in alpha.2).
- **Client-only queries** (`src/lib/data/*.ts`) for bundled-JSON / client-only data. Gated on `!isServer`. Examples: `sport-meta.ts`, `entities.ts`.

The route's `firePreloads` calls every Card's query on profile mount (and on hover via the route `preload` export). By the time the user clicks any tab, the corresponding Card's data is in flight or warm in `query()`'s cache.

## Constraints

- **No `client:only` thinking** — that's an Astro directive. Use SolidStart per-route streaming + `clientOnly` HOC only where genuinely needed.
- **Pull tokens from `@scoracle/tokens`.** Don't redefine in this repo's CSS.
- **`@scoracle/ui` does not exist yet.** Pillar primitives (Shell, NavTabs, Skeleton, Header, Footer, PizzaChart, EmptyCard) live inline here, **extract-ready** — no flagship-specific imports inside them. They migrate to `@scoracle/ui` via `git mv` when sandbox kicks off.
- **Don't break the pillar/feature seam.** Shell + NavTabs are purely structural; visual + composition concerns belong in project-side components (ContentShell here, future card compositions in other sites).

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
