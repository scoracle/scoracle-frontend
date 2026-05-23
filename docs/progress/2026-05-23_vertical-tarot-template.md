# 2026-05-23 — Vertical 5:7 tarot template + new OG route

## Goal

Replace the legacy 1200×630 landscape OG image with a vertical 5:7
tarot card (1000×1400). First commit of the unified card-share
rebuild — the artifact shape every future share commit composes into.

The new pipeline is structured so the *image attaches directly* to
social posts via the Web Share API (commit 3 wires the client
dispatcher). The OG route still exists, but the new vertical PNG it
returns is what gets attached — no longer relying on platform
crawlers to fetch og:image meta tags (an approach the user observed
failing in practice, with link previews degrading to a generic box).

## What Was Done

### NEW — `src/lib/og/build-card.ts`

Single composer for every shared card. Replaces the deleted
`build-artifact.ts`. Layout:

- Canvas 1000×1400 (5:7 tarot ratio), 50px outer breathing room.
- Card frame 900×1300 with `--bg-card` surface + 6px rounded corners.
- Weathered tarot border SVG stretched across the frame
  (`stroke="#9C9890" stroke-width="0.9"`, non-scaling).
- Optional corner numerals (TL upright, BR rotated 180°), italic
  PT Serif at 26pt.
- Primary header (top-left): image 100×100 + name (36pt) +
  subtitle (22pt italic).
- Optional compared header (top-right, anchor "end"): mirrors the
  primary block for compare cards.
- Body slot at (100, 350), 800×800, populated by per-card body
  renderer (vibe / pizza / etc.).
- Footer: scoracle.com left + date + card-type right.

Exports `CARD_BODY_AREA = { w: 800, h: 800 }` so per-card body
renderers stay positioned to a stable origin.

### NEW — `src/lib/og/cards/vibe.ts`

Pure SVG body renderer for vibe cards. Extracted from
`VibeCard.tsx`'s legacy `vibeArtifactSvg` and rescaled to the new
800×800 body area. Vibe-art 260×260 centered at top, score italic
200pt with `tierColorHex`, archetype name caps 40pt with 4pt
letter-spacing, subtext italic 28pt, credit row 18pt.

Local `TIER_HEX` table mirrors the new `tier-color.ts` thresholds
(SVG-context can't resolve CSS custom properties).

### MODIFIED — `src/lib/og/entity-facts.server.ts`

Renamed `OgEntityFacts.context` → `OgEntityFacts.subtitle` and
enriched the line:

- Player → `"{position} · {team}"` (drops the redundant SPORT;
  the team name already implies sport).
- Team → `"{conference}"` when present, else
  `"{city} · {SPORT}"`.

`RawEntity` interface gains `position` + `conference` fields.

### REWRITTEN — `src/routes/og/[cardType]/[sport]/[type]/[id].ts`

Now drives `buildCardSvg` instead of the deleted
`buildArtifactSvg`. Body renderer dispatch via
`resolveCardContent(cardType, vibe, baseUrl)` — returns
`{ innerSvg, date, cornerLabel }`. Only vibe is wired in this
commit; future commits add stats:* / compare:* branches.

Canonical URL + footer-right format preserved
(`scoracle.com/profile?sport=...&type=...&id=...&tab=...`,
"YYYY-MM-DD · vibe").

### MODIFIED — `src/components/solid/VibeCard.tsx`

Dropped the OG SVG export block at the bottom of the file
(`vibeArtifactSvg`, `tierColorHex`, `VIBE_CARD_AREA`,
`VibeArtifactInput`) — those live in `src/lib/og/cards/vibe.ts`
now. Dropped `readShareEntity` + `escapeXml` imports and the
bespoke `shareText` builder (the new generic builder lands in
commit 3).

### DELETED — `src/lib/og/build-artifact.ts`

The landscape 1200×630 composer. Replaced wholesale by
`build-card.ts`.

## Files Changed

```
src/lib/og/build-card.ts                                (NEW)
src/lib/og/cards/vibe.ts                                (NEW)
src/lib/og/entity-facts.server.ts                       (subtitle rename + enrich)
src/lib/og/build-artifact.ts                            (DELETED)
src/routes/og/[cardType]/[sport]/[type]/[id].ts         (rewritten for buildCardSvg)
src/components/solid/VibeCard.tsx                       (drop OG export block + bespoke shareText)
docs/progress/2026-05-23_vertical-tarot-template.md     (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 110/110 passing.
- Manual: hitting `/og/vibe/{sport}/{type}/{id}` on the dev server
  should return a 1000×1400 PNG (deferred — backend connectivity
  required; pipeline-level correctness covered by typecheck).

## Result

The vertical tarot template is the single composer for every
shared card going forward. Vibe is wired end-to-end; stats and
compare cards land in subsequent commits.

## What's NOT in this commit (intentional)

- **Client-side dispatch** — `navigator.share({ files, text, url })`
  with PNG attached. Lands in commit 3 alongside the share-text
  builder, sport-aware category mapping, and Firefox fallback modal.
- **ShareTrigger component** — replaces the popover-based
  `ShareButton`. Commit 4.
- **Legacy ShareButton + intents.ts deletion** — still present;
  VibeCard's old ShareButton still mounts (with no-op shareText).
  Cleaned up in commit 5.
- **Stats / compare body renderers** — commits 6 and 7 add
  `pizza.ts` + `compare-pizza.ts` body builders and wire the
  per-category dispatch branches.
