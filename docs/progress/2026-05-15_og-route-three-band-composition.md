# 2026-05-15 — OG route three-band composition (header + framed card + footer)

## Goal

Bring the OG image's visual quality up to parity with the legacy
in-app share modal: real weathered tarot border around the card area,
header band with entity image + name + context, footer band with the
canonical share URL + data date. Removes the placeholder rect frame
and the generic "scoracle.com" footer text.

Step 4b of the Shell retool sequence. Step 4c wires the og:image meta
tags on profile pages so social platforms find this route automatically.

## What Was Done

### New server-side helpers in `src/lib/og/`

- **`entity-facts.server.ts`** — `getOgEntityFacts(sport, type, id)`
  server fn (query-wrapped) hits the Go entity endpoint and returns
  `{name, imageUrl, context}` in the same shape `share-entity.ts`
  resolves client-side from the bundled JSON. Player and team paths
  diverge on which fields make up the context line.
- **`load-image.ts`** — `loadImageAsDataUri(url)` fetches a remote
  image (entity photo / team logo), encodes the bytes as a base64
  `data:` URI for `<image href>` embedding. Uses `Buffer.from(...)`
  (works on Workers via `nodejs_compat` flag) to avoid the
  `String.fromCharCode(...bigArray)` stack blowup. Module-scope cache
  per Worker instance; returns `null` on any fetch failure so the
  header band degrades gracefully.
- **`load-frame.ts`** — `loadFrameInner(baseUrl)` fetches
  `public/chrome/weathered-tarot-border.svg` and returns its inner
  contents (everything between outer `<svg>` tags). The caller wraps
  those in its own positioning `<svg>` element. Cached per Worker.

### VibeCard.tsx — card-area-relative coords

`vibeArtifactSvg` now positions content within a 700×405 card area at
origin (0,0). Exports a `VIBE_CARD_AREA = {w: 700, h: 405}` constant
so the composer knows the slot size. Caller (build-artifact) wraps the
output in `<g transform="translate(250, 120)">` to drop the card into
the OG canvas's card area.

Also renders the archetype corner numerals (TL + BR rotated) — they
belong to the Card content, not to the frame, since the value
(`archetype.numeral` — "VIII", "XIX", etc.) is Card-specific.

### build-artifact.ts — three-band composer

Major rewrite. Now composes a 1200×630 canvas with three bands:

- **Header band** (y=0..110): optional entity image at 80×80 left, name
  at PT Serif 36 right of the image, context line below in italic
  secondary color. Falls back to no header when entity facts are null.
- **Card area** (700×405 at x=250, y=120): solid card-surface fill
  (`#F4F1EB`), the weathered tarot border SVG stretched as the frame
  (`viewBox 0 0 100 100 / preserveAspectRatio="none"` — same stretch
  behavior as `.card::before` on the live site), and the per-Card
  inner SVG translated into position.
- **Footer band** (y≈585): canonical share URL on the left, data date
  on the right. Both italic PT Serif.

Page surface (`#EAE5DD`) fills the bands around the card area so the
card visually "sits on the page" — same metaphor as the live profile.

### Route handler updates

- Fetches frame asset, entity facts, and (for `cardType=vibe`) the
  vibe row in parallel.
- Fetches entity image after entity facts (depends on imageUrl).
- Computes canonical URL like
  `scoracle.com/profile?sport=NFL&type=team&id=19&tab=vibes` — the
  tab segment maps from cardType via a small `TAB_FOR_CARD` table.
- Uses the vibe row's `generated_at` as the footer date (formatted
  via `formatDate`).
- Returns 200 + PNG with the same Cache-Control as before.

## Files Changed

```
src/components/solid/VibeCard.tsx
src/lib/og/build-artifact.ts
src/lib/og/entity-facts.server.ts                   (NEW)
src/lib/og/load-frame.ts                            (NEW)
src/lib/og/load-image.ts                            (NEW)
src/routes/og/[cardType]/[sport]/[type]/[id].ts
docs/progress/2026-05-15_og-route-three-band-composition.md (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- `curl /og/vibe/nfl/team/19 → /tmp/og-vibe-4b.png`: HTTP 200, 38 694
  bytes, 1200×630 RGBA. Entity logo + name + context render in the
  header band; weathered tarot frame around the VibeCard inner
  content (corner numerals, vibe-art image, score, archetype name,
  subtext, credit); canonical URL + date in the footer band.
- User confirmed visually — close enough to legacy modal quality;
  fine-tuning deferred.

## Result

OG image now produces a complete artifact that visually matches the
legacy in-app share modal. The pipeline is ready to be the source of
truth for social-feed previews. Step 4c wires the `<meta og:image>`
tags on profile pages so social crawlers find this route, then step
4d is the production deploy + X share verification.

## What's NOT in this commit (intentional)

- **og:image / twitter:card meta tags on profile.tsx** — step 4c.
- **Production deploy + X share test** — step 4d.
- **Fine-tuning of header/footer typography, frame stretching, etc.**
  — user signed off on "close enough"; visual polish lands later.
- **Per-cardType inner renderers beyond vibe** — only VibeCard wired
  today. StatsCard / CompareCard / TraitsCard / MetaShell inner
  renderers can land as separate commits when those Cards become
  shareable (Phase D and beyond).
