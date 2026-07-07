# 2026-07-07 - Self-Host Fraunces

## Goal

Make Fraunces real for every visitor. The token stacks declare
`'Fraunces', Georgia, …` but the repo served no font file, so the brand
face only rendered on machines with Fraunces installed locally (the
designer-machine illusion — production looked on-brand exactly for the
people closest to the brand). Scott confirmed the intended look from a
local-Fraunces machine and asked for more of it in the product; the
first step is shipping the face at all. Closes the Fraunces half of
finding 1 in
[docs/audits/2026-07-07_profile-aesthetic-alignment-audit.md](../docs/audits/2026-07-07_profile-aesthetic-alignment-audit.md).

## What Changed

- Vendored Fraunces variable woff2 (full `wght` 100-900 + `opsz` 9-144
  axes; upright + italic; latin + latin-ext subsets) from
  `@fontsource-variable/fraunces` 5.2.5 into `public/fonts/`, with the
  SIL OFL license alongside.
- `src/global.css`: four `@font-face` blocks after the tokens import.
  Family name is `Fraunces` — exactly the token stacks' name, so no
  token change is needed and the local-font path is superseded.
  `font-display: swap`; unicode-range keeps latin-ext (Díaz, Şahin, …)
  lazy. Browsers' default `font-optical-sizing: auto` now serves the
  warm display cut at wordmark/entity-name/score sizes and the text cut
  at body sizes — the vision's Display/Body split from one family.
- `src/app.tsx`: preload `<Link>` for the upright latin cut (first
  paint); italic and latin-ext ride unicode-range on demand.
- `public/_headers`: `/fonts/*` → immutable year-long cache.
- Audit doc: finding 1 marked resolved for Fraunces with an addendum.

DM Sans deliberately NOT loaded yet: nothing references
`--font-numeric`, so the bytes would be dead weight. Load it in the
same change that sweeps the numeric role onto tables/small scores
(audit finding 2).

## Files Changed

- `public/fonts/fraunces-latin-full-normal.woff2` (new, 118 KB)
- `public/fonts/fraunces-latin-full-italic.woff2` (new, 146 KB)
- `public/fonts/fraunces-latin-ext-full-normal.woff2` (new, 103 KB)
- `public/fonts/fraunces-latin-ext-full-italic.woff2` (new, 127 KB)
- `public/fonts/LICENSE-fraunces.txt` (new)
- `src/global.css`
- `src/app.tsx`
- `public/_headers`
- `docs/audits/2026-07-07_profile-aesthetic-alignment-audit.md`
- `progress_docs/2026-07-07_self-host-fraunces.md` (new)

## Verification

- All four woff2 files verified (`wOF2` magic bytes; sourced from the
  npm-published fontsource tarball, not a CDN scrape).
- `@font-face` unicode-ranges copied verbatim from fontsource's
  `full.css` / `full-italic.css`.
- CSP already allows self-hosted fonts (`font-src 'self'`,
  `src/middleware.ts:42`).
- `npm run typecheck` / `npm test` NOT run: this environment has no
  `NODE_AUTH_TOKEN` for the `@scoracle/tokens` GitHub Packages install.
  The TS surface of the change is one import (`Link` from
  `@solidjs/meta`, a documented export) + one JSX element; please run
  typecheck locally before merging.

## Result

Every visitor gets Fraunces across all `--font-display` / `--font-body`
surfaces (wordmark, entity names, large scores, blurbs, card labels) —
previously Georgia unless locally installed. ~118 KB on first paint for
most visitors, rest lazy.

## Follow-Up

- Visual QA on a machine WITHOUT Fraunces installed (or DevTools →
  block local fonts): confirm the swap window is acceptable and small
  serif labels hold up in real Fraunces (audit finding 7 becomes
  visible now).
- DM Sans + `--font-numeric` adoption sweep (audit findings 1/2).
- The audit's type-discipline items (findings 5-6) get more urgent now
  that medium/semibold weights render in a real variable face.
