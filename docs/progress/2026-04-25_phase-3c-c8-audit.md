# Phase 3c, Commit 8 — End-of-Phase audit

**Date:** 2026-04-25
**Scope:** Final sweep across the whole `scoracle-frontend` tree after the Phase 3c port. Same nine-pass Astro residue scan we ran at the end of Phase 3b, plus a focused SSR-safety pass on the new components (`onCleanup` patterns specifically — the issue that caught us in Phase 3b's Header port).

## Method — nine pass scan

1. `from 'astro:'` / `@astrojs/*` imports
2. `.astro` files anywhere in the tree
3. `astro.config.*` files
4. `astro` / `@astrojs` deps in `package.json`
5. Astro framework markers: `Astro.`, `getImage`, `ClientRouter`, `client:only|load|idle|visible|media` directives
6. `astro:` URL schemes in JSX
7. Top-level browser globals at module scope (`^window\.`, `^document\.`, `^navigator\.`, `^localStorage`)
8. `onCleanup` bodies that touch browser globals — verified each one has either an `isServer` guard or is nested inside `onMount`
9. Stale Astro mentions in source comments / docstrings — confirmed each is intentional historical context, not residue

## Findings — clean

| Pass | Result |
|---|---|
| Astro module imports | None |
| `.astro` files | None |
| `astro.config.*` | None |
| Astro deps in `package.json` | None |
| Astro framework markers in code | One match: `routes/index.tsx:11` — a docstring comment explicitly comparing `clientOnly` to its Astro equivalent (`client:only="solid-js"`). Intentional historical-context note for readers familiar with the prior stack. Not residue. |
| `astro:` URL schemes | None |
| Top-level browser globals | None — every `window.`/`document.`/`navigator.` access lives inside a function body or a Solid lifecycle hook |
| `TabActiveContext` (renamed render-prop pattern) | None — confirmed the older context-based approach was fully migrated to the `isActive` accessor pattern in C1 |

## SSR-safety pass — three components have `onCleanup` that touches browser globals

| Component | Pattern | Status |
|---|---|---|
| `Header.tsx` | `onCleanup` is **top-level** (sibling of `onMount`) — fires on SSR teardown | ✅ has `if (isServer) return;` guard (added Phase 3b) |
| `routes/profile.tsx` | `onCleanup` is **nested inside `onMount`** — only registers on client | ✅ has `if (isServer) return;` guard anyway (defensive, added in C7) |
| `EntityMeta.tsx` | `onCleanup` is **nested inside `onMount`** | ✅ guard **added in this commit** (was technically SSR-safe via nesting; defensive parity added) |

### Why nesting matters — and why the defensive guard helps anyway

Solid's `onCleanup` runs at end-of-scope-disposal *regardless of where it was registered*. But it only fires if it was actually registered. When `onCleanup` lives **inside** `onMount`, the registration never runs on the server (because `onMount` is client-only) — so cleanup never fires there either. Nested = SSR-safe by virtue of registration order.

When `onCleanup` lives **at the top level** of the component setup (sibling of `onMount`), it registers on both server and client. Server runs it at end-of-render → if the body touches `document`/`window`, ReferenceError → SSR crashes. That's the bug we caught with Header in Phase 3b.

The `EntityMeta` cleanup was nested in `onMount` and therefore SSR-safe. **But** if a future maintainer flips that nesting, the SSR crash would surface only when SSR'd (not when wrapped in `clientOnly`, which is how it's currently consumed in `routes/profile.tsx`). Defensive isServer guard means the guard catches the crash regardless of how the cleanup is registered. Cheap insurance.

### `Stale Astro mentions in code comments — all intentional historical context

Seven mentions, all kept on purpose:

| File | Why kept |
|---|---|
| `EntityMeta.tsx:4` | "Replaces both `PlayerMetaWidget.astro` and `TeamMetaWidget.astro`" — provenance, useful for git archeology |
| `Header.tsx:65` | TODO callout for the unported pre-paint inline `<script>` (dark-mode FOUC) — load-bearing follow-up pointer |
| `routes/index.tsx:11` | Docstring comparing `clientOnly` ↔ `client:only="solid-js"` — readers familiar with Astro can map the concept |
| `PizzaChart.tsx:17–18` | Docstring noting the dropped `createPizzaChartBridge()` and naming the consumer that's gone (`StatsComparisonContent.astro`) |
| `routes/profile.tsx:15` | "verbatim ports from the Astro repo" — explains why these are `clientOnly`, useful for next-time-we-touch-this readers |
| `routes/profile.tsx:22` | References the `~/Scoracle/src/pages/profile.astro` source for the imperative ResizeObserver pattern we ported — useful provenance |
| `routes/index.css:1` (Phase 3b carryover) | Provenance line for the home-layout styles |

These are documentation breadcrumbs, not stale framework references.

### Component count check

`src/components/solid/` has **28 files** (6 from Phase 3b: CrystalBall, SearchBar, Header × 2 each + 22 from Phase 3c: TabContainer × 2, content-tabs.css, EntityMeta × 2, NewsCard, NewsTab × 2, CoMentionsTab × 2, XTab × 2, VibesTab × 2, StatsCard, StatsTab × 2, TraitsTab × 2, CompareTab × 2, PizzaChart). Matches expected.

## Tracked follow-ups (carried forward from earlier phases)

These were flagged in earlier audits and remain tracked. They're additive improvements, not blockers:

1. **Image optimization for sport logos** — sharp / squoosh / `vite-imagetools` before launch. Currently raw PNGs from `/public/images/`.
2. **Dark-mode pre-paint script** — port the inline `<script>` from the Astro `Layout.astro` into `entry-server.tsx`'s `<head>` so dark-mode users don't get a flash of light theme. Surfaced in the Phase 3b audit; still relevant.
3. **PizzaChart product improvements** — entry animation, hover/focus tooltips, reduced-motion respect, ARIA labels, percentile-ring overlay. Logged in C4's progress doc per the strategic discussion before that commit.
4. **Cloudflare Workers deployment adapter** — Phase 4 territory. SolidStart 2.0-alpha dropped the `cloudflare_module` Nitro preset; Workers deployment will need a Vite-based approach (`@cloudflare/vite-plugin` or manual build target).
5. **Sport-store hydration micro-flicker** — only fix if user-visible. Tracked from Phase 3b.

## Files Changed

Modified:
- `src/components/solid/EntityMeta.tsx` — added `isServer` import + defensive guard inside the nested `onCleanup`.

Added:
- `docs/progress/2026-04-25_phase-3c-c8-audit.md` (this file).

## Verification

- `npm run typecheck` → clean.
- 9-pass audit → no Astro residue.
- 3 onCleanup-with-browser-globals sites → all guarded, all SSR-safe.

## Result

**Phase 3c complete and clean.** Eight commits shipped between C1 and C8 (after the C2/C3 and C5/C6 merges):

- C1: TabContainer + content-tabs + EntityMeta
- C2: NewsCard + 4 tabs (News, X, CoMentions, Vibes)
- C4: PizzaChart + StatsTab
- C5: StatsCard + TraitsTab + CompareTab
- C7: Wire `routes/profile.tsx` (the consequential one)
- C8: This audit

`scoracle-frontend` is fully Solid-aligned. No Astro framework code, no Astro deps, no `.astro` files, no functional Astro markers. All SSR-touching `onCleanup` patterns guarded. Twelve commits total on `main`; ready for browser-side smoke + the next phase.

**Phase 4** is next on the plan: parity verification (browser-side checks against the three pinned migration entities) and DNS cutover with the Astro Worker as 72-hour hot standby.
