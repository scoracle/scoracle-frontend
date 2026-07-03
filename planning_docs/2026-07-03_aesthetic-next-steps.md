# 2026-07-03 — Aesthetic alignment: next steps

Companion to `progress_docs/2026-07-03_aesthetic-alignment-fonts-and-marks.md`
(and the tokens/wiki mirrors). That pass landed the type system and brand
marks; this doc is the ordered queue of what remains.

## 1. Ship the fonts to production (blocking, mechanical)

The `@font-face` files are on the branch but sit inert until the token stacks
name the families:

1. Merge the `scoracle-tokens` branch; publish `v0.6.1`
   (`git tag v0.6.1 && git push --tags`).
2. In `scoracle-frontend`: `npm update @scoracle/tokens` (lockfile picks up
   0.6.1), verify `npm run typecheck && npm test`, deploy.
3. Sanity-check scoracle.com: masthead + body render Fraunces, leaderboard
   metrics render DM Sans, no FOUT worse than `swap`.

## 2. OG / share-artifact font parity

Share cards still render **PT Serif** (`public/og/fonts/`,
`src/lib/og/build-card.ts`, `src/lib/cards/bodies/*`). Once the site is
Fraunces, screenshots and OG cards will disagree — exactly the drift the
share-artifact doctrine warns about.

- Fetch Fraunces *static instances* (regular + italic, text opsz) — resvg-wasm
  has no variable-font instancing guarantee, so don't reuse the variable
  woff2 blindly; verify a rendered OG card before switching.
- Swap the `font-family="PT Serif"` literals in the SVG builders, drop
  `@fontsource/pt-serif` from `package.json`, replace the files in
  `public/og/fonts/`.

## 3. Leaderboard + profile page pass

The 2026-07-03 pass touched these pages only at the token-role level;
the composition still deserves a dedicated look (in progress this session).

## 4. Crisp-tarot frame (standing follow-up)

`.card::before` in `global.css` notes the weathered-tarot border SVG renders
faint ("washed out"). Follow-up: thicken the source SVG stroke in
`public/chrome/weathered-tarot-border.svg` + re-verify the OG Frame copy.

## 5. Sentient, if licensed later

The vision keeps Sentient (Fontshare) as the intended body face. Fontshare's
CDN/API is unreachable from CI-like environments; bringing it in means
downloading the family manually and committing it like the others. If that
happens: point `--font-body` at Sentient in `scoracle-tokens`, keep Fraunces
for display/heading, and re-check body line-height (Sentient runs taller).

## 6. Smaller sweeps (batch into any future pass)

- `apple-touch-icon` PNG (180×180) exported from the new favicon art —
  iOS home-screen bookmarks currently fall back to a screenshot.
- Input radius audit: search/compare inputs use 2px, dropdown panels 6px,
  Skeleton 4px, ShareTrigger 4px — pick one control-radius token, or bless
  the 2px-input / 6px-panel split explicitly in the vision doc.
- iOS parity check of the numeric role: web now renders DM Sans for
  tables/stat values; confirm `scoracle-ios` maps its numeric role to the
  platform numeric sans (SF Pro / SF Mono digits) per
  `docs/primitive-parity.md`, and run `npm run audit:clients` with an iOS
  checkout present.
