# Phase 3b end-of-phase audit — Astro residue scan

**Date:** 2026-04-25
**Scope:** Sweep `~/scoracle-frontend` for any legacy Astro code, imports, file extensions, dependencies, or stale doc-string references. Remediate anything functional; document intentional historical mentions.

## Method

Nine grep passes across the entire `src/`, `scripts/`, and root config:

1. `from 'astro:?'` / `from '@astrojs/'` imports
2. Astro framework markers in code: `Astro.`, `getImage`, `ClientRouter`, `client:only|load|idle|visible|media`
3. `.astro` file extension anywhere
4. `astro.config.*` files
5. `astro` / `@astrojs` deps in `package.json` and `package-lock.json`
6. Current-tense Astro mentions in `CLAUDE.md` and `README.md`
7. Comments / docstrings in source mentioning "Astro"
8. Hard-coded `~/Scoracle` paths in source / scripts / public
9. `astro:` URL schemes in JSX

## Findings — clean on the structural side

| Pass | Result |
|---|---|
| Astro module imports | None |
| Framework markers (`Astro.`, `getImage`, `ClientRouter`, `client:*` directives) | None functional. Two stale comment references — fixed. |
| `.astro` files | None |
| `astro.config.*` files | None |
| Astro deps in `package.json` / `package-lock.json` | None |
| `CLAUDE.md` / `README.md` Astro mentions | All legitimate — references to the Astro repo as port-source |
| Hard-coded `~/Scoracle` paths in source | None functional. Two `Scoracle` substring matches were brand mentions (`<title>Scoracle</title>`, type-file header) — not paths |
| `astro:` URL schemes | None |

The repo has **no Astro framework code, no Astro file types, no Astro dependencies**. SolidStart 2.0-alpha is the sole framework.

## Remediated stale comments / docstrings

Four code-comment references to Astro that no longer reflected current reality, fixed in this commit:

| File | Was | Is now |
|---|---|---|
| `src/lib/types/index.ts:19` | "Sport logos are handled via Astro `<Image />` imports... for automatic WebP/AVIF optimization" | Notes the move to raw PNGs in `/public/images/` and points to the home-page-port progress doc for the optimization follow-up |
| `src/lib/utils/data-sources.ts:5` | "See `astro.config.mjs` for the build-time check" — file doesn't exist | Points to `vite.config.ts > envPrefix: "PUBLIC_"` and notes wrangler.jsonc as TBD per Phase 4 |
| `src/components/solid/CrystalBall.tsx:11` | "Astro handles build-time image optimization (getImage)" | Notes paths come in as props from `/public/images/` and references the optimization follow-up |
| `src/components/solid/CrystalBall.tsx:45` | "client:only guarantees client execution" — Astro directive | Notes the route imports CrystalBall via `clientOnly()` from `@solidjs/start`, which is what now skips SSR |

One comment **flagged real missing work** during the audit:

`src/components/solid/Header.tsx:64` originally said "Sync theme signal with the class applied by the pre-paint script in Layout.astro." That pre-paint inline `<script>` is **not yet ported** from the Astro `Layout.astro`. Without it, dark-mode users will see a brief flash of the light theme on first paint (FOUC). Updated the comment to a `TODO:` callout so it's discoverable later. **Tracked as follow-up** — port the inline `<script>` block into `entry-server.tsx`'s `<head>` so it runs before paint.

## Intentional historical mentions kept

Four references to "Astro" were left in place because they're explanatory or provenance, not residue:

| File | Reason |
|---|---|
| `src/env.d.ts:9` | Explains why we use the `PUBLIC_` env-prefix convention (matches the Astro repo so port-source code lifts in without renames) |
| `src/routes/index.tsx:11` | Docstring explicitly compares `clientOnly` to its Astro equivalent (`client:only="solid-js"`) for readers familiar with the prior stack |
| `src/components/solid/Header.tsx:65` | The `TODO:` callout for the unported pre-paint script — load-bearing pointer to follow-up work |
| `src/routes/index.css:1` | Provenance line: "ported from `src/pages/index.astro` inline styles." Useful for tracing where the rules came from when iterating on the home layout |

These don't hide any functional dependency on Astro. They're documentation breadcrumbs.

## Files Changed

Modified:
- `src/lib/types/index.ts`
- `src/lib/utils/data-sources.ts`
- `src/components/solid/CrystalBall.tsx`
- `src/components/solid/Header.tsx`

Added:
- `docs/progress/2026-04-25_phase-3b-astro-residue-audit.md` (this file)

## Verification

`npm run typecheck` → clean after remediation. Re-audit grep returned only the four intentional historical mentions enumerated above.

## Result

`scoracle-frontend` is **fully Solid-aligned**. No Astro framework code, no Astro deps, no Astro build artifacts, no stale references claiming Astro mechanics that no longer apply. Remaining Astro mentions in source are explicitly historical breadcrumbs (env-prefix convention, `clientOnly` ↔ `client:only` comparison, pre-paint TODO, provenance line).

Phase 3b is complete and clean. Next: **Phase 3c** — port the profile-page islands (EntityMeta, NewsCard, StatsCard, TabContainer, Compare flow, X tab, all the tab components) into `src/components/solid/` and wire into `routes/profile.tsx`. That's the heaviest porting commit ahead.

### Follow-ups tracked from this audit
- **Image optimization** for sport logos (sharp / squoosh / vite-imagetools) before launch — flagged in `2026-04-25_home-page-port.md`.
- **Dark-mode pre-paint script** — port the inline `<script>` from `Layout.astro` into `entry-server.tsx`'s `<head>` so dark-mode users don't see a flash of light theme on first paint. New follow-up surfaced by this audit.
