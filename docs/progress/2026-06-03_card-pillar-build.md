# 2026-06-03 — Card pillar: registry + `<Card>` + shared SVG bodies

## Goal

Promote the Card to a first-class element (design: `~/scoracleWiki/wiki/Architecture/Card
Pillar.md`). One Card object = content (pure-SVG body) + aesthetic (`<Shell>`/frame) +
presentation (thin OG handler). Kill the 4-place definition drift + the in-app/OG renderer
drift; make every appropriate card shareable by default. Committed as one arc with the
preceding teardown.

## What Was Done

- **Shared SVG body modules** `lib/cards/bodies/`: `tier.ts` (single OG tier-color table,
  killed 3 dupes), `vibe.ts` (moved from `og/cards/`), `meta.ts` (extracted from the OG
  handler), `composite.ts` (pizza via the SAME `lib/charts/arc-math` the in-app chart uses —
  one geometry source), `specialist.ts` (hero). Pure `(data) → SVG <g>` in the 800×800 body box.
- **Card identity SSOT** `lib/cards/card-meta.ts`: `CardId` + `CARD_META` (archetype /
  shareable / shareCategory) — pure data, zero component imports, safe for `<Card>`, the
  share-text builder, and the server OG handler alike.
- **`<Card>` component** `components/solid/Card.tsx`: drop-in `<Shell>` that auto-wires
  `<ShareTrigger>` from `CARD_META` + ProfileContext. The 4 canvas cards swapped
  `<Shell>`→`<Card id=…>` (CompositeCard's first facet carries the single trigger via a small
  `FacetFrame`); VibeCard shed its hand-written trigger + entityName plumbing. `shareable` in
  `CARD_META` is the one switch.
- **Card Registry**: `profile-tabs.tsx → card-registry.tsx` (`CARD_REGISTRY` / `CardDef`);
  importers (ContentShell, profile.tsx, preload test) updated.
- **OG handler = thin dispatch**: `OG_BODIES[cardType] ?? OG_DEFAULT_BODY` (`lib/cards/og-bodies.ts`)
  — no switch, no per-card logic, no inline meta body. cardType == cardId (profile `og:image`
  simplified; `vibe` alias kept for cached links). Share copy via `CARD_META.shareCategory`;
  `categories.ts` deleted. `scarcity` extracted to `lib/cards/scarcity.ts` (shared, no drift).

## Files Changed

New: `lib/cards/{card-meta,og-bodies,scarcity}.ts`, `lib/cards/bodies/{tier,vibe,meta,composite,specialist}.ts`,
`components/solid/Card.tsx`. Renamed: `profile-tabs.tsx → card-registry.tsx`. Edited:
`CompositeCard`, `SpecialistCard`, `TrendsCard`, `VibeCard`, `ContentShell`, `profile.tsx`,
`og/[cardType]/…/[id].ts`, `share/{text,ShareTrigger}.ts(x)` + tests. Deleted: `og/cards/`,
`share/categories.ts`.

## Verification

`npm run typecheck` clean; `npm test` 97/97 (12 files); new bodies XML-validated via xmllint
through the real `buildCardSvg`; OG PNGs rendered locally with **real data** (Lamine Yamal) +
the real resvg wasm + PT Serif fonts — composite pizza, specialist hero, and meta default all
render on-brand; `npm run build` clean (169 modules). (OG can't rasterize in `npm run dev` —
the wasm asset isn't served as a binary there; a known dev-only limitation, works in prod.)

## Result

A card is now defined once: in-app wiring in `CARD_REGISTRY`, identity/share in `CARD_META`,
OG render in `OG_BODIES` — one `CardId` taxonomy. `<Card>` is the universal content unit;
share-by-default flows from `shareable`. Composite/Specialist/Starline/Vibes are shareable;
sharing a profile (or a ledger) renders the Meta card. Fast-follow: leaderboard top-N
snapshot, in-app Canvas convergence (`<svg innerHTML>` + CSS hover), bespoke starline sparkline.
