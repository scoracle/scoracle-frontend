# 2026-05-15 — OG route dispatcher + VibeCard.vibeArtifactSvg

## Goal

Wire VibeCard end-to-end through the OG image route. The route now
fetches the entity's vibe data + the matching archetype illustration,
calls `vibeArtifactSvg` (co-located in VibeCard.tsx), and slots the
resulting SVG `<g>` into the OG frame composer.

Step 4a of the Shell retool sequence. Step 4b adds the real weathered
tarot border, entity-image header band, and canonical-URL footer band
so the OG image visually matches what the legacy in-app share modal
renders.

## What Was Done

### New helpers in `src/lib/og/`

- **`escape-xml.ts`** — extracted from `build-artifact.ts`; reused by
  every Card's SVG renderer to guard against entity-name / context
  strings breaking the artifact.
- **`load-vibe-art.ts`** — fetches a vibe-art archetype illustration
  (`public/vibe-art/<slug>.svg`) on first use, caches per-Worker
  instance. `svgToDataUri(svg)` helper encodes SVG text as a
  `data:image/svg+xml;base64,...` URI suitable for `<image href>`
  embedding (so we don't have to strip / re-emit the SVG body).

### `VibeCard.tsx` — co-located SVG renderer

Pure function `vibeArtifactSvg(input)` returns an SVG `<g>` string
positioned within the 1200×630 OG canvas. Mirrors `cardBody()`'s
visual order: vibe-art image at top, large italic tier-colored score,
caps archetype name, italic subtext, small credit row.

Also exports `tierColorHex(score)` — sibling to the existing
`tierColor(score)` that returns `var(--*)` strings. The hex version
substitutes the percentile-tier hex values from
`@scoracle/tokens@0.4.0` because SVG-on-Worker can't resolve CSS
custom properties.

### `build-artifact.ts` — dispatcher slot

Now accepts an optional `innerSvg` field on `ArtifactInput`. When
supplied, the per-Card content slots into the placeholder frame in
place of the route-keyed placeholder copy. When omitted, the
placeholder still renders so the route stays useful for unwired
card types.

### Route handler `src/routes/og/[cardType]/[sport]/[type]/[id].ts`

New private `resolveInner(cardType, sport, type, id, baseUrl)` async
function dispatches by `cardType`. For `vibe`, it calls `getVibe`
(server fn that hits the Go API), `scoreToArchetype`, `loadVibeArt`
in series, then `vibeArtifactSvg`. Returns `undefined` when data is
null (404 from backend) — the placeholder takes over.

## Files Changed

```
src/components/solid/VibeCard.tsx
src/lib/og/build-artifact.ts
src/lib/og/escape-xml.ts                                (NEW)
src/lib/og/load-vibe-art.ts                             (NEW)
src/routes/og/[cardType]/[sport]/[type]/[id].ts
docs/progress/2026-05-15_og-route-vibecard-dispatch.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- `curl http://localhost:5174/og/vibe/nba/player/237 → /tmp/og-vibe.png`:
  HTTP 200, image/png, 27 362 bytes, 1200×630 RGBA. Output reflects
  whatever the local Go API returned for the vibe row (real
  VibeCard content when data exists; placeholder text when null).
- User-confirmed live: `/og/vibe/nfl/team/19` on dev server returns
  a valid PNG. (X composer doesn't auto-fetch the preview because
  localhost isn't crawlable from the public internet — expected; the
  OG-meta-tag flow only kicks in after deployment, step 4d.)

## Result

Per-Card-type dispatcher works. VibeCard is the first wired Card. The
artifact pipeline is now data-driven instead of placeholder-only. The
visual quality is still below the legacy share modal — step 4b's job
is to bridge that gap by adding the real tarot border + entity-image
header band + canonical-URL footer band.

## What's NOT in this commit (intentional)

- **Real weathered tarot border** (frame asset embed) — placeholder
  `<rect>` stroke still in play. Step 4b.
- **Entity-image header band** (logo + name + context line) — the OG
  has no entity identification today; step 4b fetches entity facts
  server-side and adds the header.
- **Canonical-URL footer band** — current footer is just "scoracle.com".
  Step 4b wires the actual canonical share URL keyed by `?tab=`.
- **og:image / twitter:card meta tags on profile.tsx** — step 4c.
- **Production deploy + X share verification** — step 4d.
