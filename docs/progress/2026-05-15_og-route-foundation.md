# 2026-05-15 — Server-side OG image route foundation

## Goal

Stand up `/og/<cardType>/<sport>/<type>/<id>` returning a 1200×630 PNG
rendered server-side via `@resvg/resvg-wasm`. Foundation for the OG-only
share strategy locked 2026-05-15: profile-page URLs become the share
artifact via `<meta og:image>` pointing at this route, so X / Facebook /
iMessage / Discord auto-fetch beautiful previews when users paste links.
Drops the need for a client-side share modal + html-to-image snapshot.

Step 3 ships the pipeline (route → SVG composer → resvg-wasm → PNG response)
with placeholder content. Step 4 wires per-Card SVG renderers (VibeCard
first) and the og:image meta tags on profile pages.

## What Was Done

New deps:

- `@resvg/resvg-wasm` 2.6.2 — Rust-based SVG rasterizer compiled to WASM.
  ~2.4 MB uncompressed; runs on Cloudflare Workers (paid tier; well under
  the 10 MB compressed cap).
- `@fontsource/pt-serif` — Regular + Italic latin woff2 (~34 KB each).
  PT Serif fills the role of the live site's Georgia fallback. Workers have
  no system fonts so we ship our own; PT Serif at OG sizes is visually
  indistinguishable from Georgia. Real brand fonts TBD per the session
  context (the "Tan Nimbus / Sentient" references in the wiki are prior-
  session hallucinations).

New module `src/lib/og/`:

- `load-fonts.ts` — bundles PT Serif Regular + Italic via Vite `?url`
  imports (`./fonts/*.woff2`), fetches once per Worker instance via the
  same-origin URL (assets-first routing through the ASSETS binding),
  caches the bytes in module scope.
- `rasterize.ts` — `rasterizeSvg(svg, baseUrl) → Uint8Array`. Initializes
  resvg-wasm once per Worker instance, memoized on `globalThis` so HMR
  in dev doesn't try to re-init (resvg throws "Already initialized" if
  `initWasm` is called twice). Registers PT Serif as the default font.
- `build-artifact.ts` — `buildArtifactSvg({cardType, sport, type, id}) →
  string`. Composes the placeholder 1200×630 SVG: Bone surface, inset
  frame, corner IDs (TL + BR rotated), centered route-keyed heading +
  subtitle, footer site mark. No inline XML comments — resvg-wasm rejects
  `--` per the XML spec, which makes inline annotations a footgun;
  structure is documented as TS comments above the template literal.

New route `src/routes/og/[cardType]/[sport]/[type]/[id].ts`:

- Exports `GET(event: APIEvent)`.
- Reads path params, composes + rasterizes, returns PNG with
  `Cache-Control: public, max-age=300, stale-while-revalidate=86400`.
- 500 + text/plain error response on failure.

`src/lib/og/fonts/`:

- `pt-serif-regular.woff2`, `pt-serif-italic.woff2` — committed binary
  assets. Vite copies them into `dist/client/assets/` with hashed names
  at build time; the same-origin fetch in `load-fonts.ts` routes through
  the ASSETS binding.

## Files Changed

```
package.json
package-lock.json
src/lib/og/fonts/pt-serif-regular.woff2  (NEW binary)
src/lib/og/fonts/pt-serif-italic.woff2   (NEW binary)
src/lib/og/load-fonts.ts                 (NEW)
src/lib/og/rasterize.ts                  (NEW)
src/lib/og/build-artifact.ts             (NEW)
src/routes/og/[cardType]/[sport]/[type]/[id].ts  (NEW)
docs/progress/2026-05-15_og-route-foundation.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- `curl http://localhost:5174/og/vibe/nba/player/237 → /tmp/og-test.png`:
  HTTP 200, image/png, 18 618 bytes, 1200×630 RGBA. Placeholder content
  shows "Scoracle vibe" + "nba · player · 237" centered, corner ID "237".
- `curl http://localhost:5174/og/stats/football/team/16 → ...`: HTTP 200,
  19 KB PNG. Route-keyed params reflected.
- User confirmed visually (placeholder PNG sent inline).

## Result

OG image rendering pipeline lives end-to-end on the dev server. Bundle
weight is reasonable (~2.5 MB total worker addition; mostly the WASM
rasterizer). Per-Card SVG renderers + og:image meta tags are the
remaining work for step 4.

## What's NOT in this commit (intentional)

- **Per-Card SVG content.** Placeholder text only. VibeCard's `artifactSvg`
  lands in step 4 alongside the dispatcher logic in `build-artifact.ts`.
- **Real frame asset.** The placeholder uses a plain `<rect>` stroke. Step 4
  embeds the weathered tarot border SVG asset for the proper chrome.
- **Header + footer bands.** No entity image + name header; no Scoracle mark
  + canonical URL + date footer. Step 4 adds these.
- **og:image / twitter:card meta tags on profile pages.** Step 4 wires the
  meta tags on `routes/profile.tsx` so social platforms auto-fetch.
- **Production deploy + X share test.** Step 4's verification step.
