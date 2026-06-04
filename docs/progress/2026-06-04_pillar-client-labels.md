# 2026-06-04 — Client pillar labels: General/Special/Vibe (players), Rating/Vibe (teams)

## Goal

Per Scott: the rating pillars get superhero-style client labels — players have a **General**
power (composite) + a **Special** power (specialist) + a **Vibe**; teams have just a
**Rating** (composite) + a **Vibe**. No specialist for teams ("there are no specialist
teams").

## What Was Done

- **One resolver** (`lib/cards/card-meta.ts` → `pillarLabel(cardId, type)`): composite →
  "General" (player) / "Rating" (team); specialist → "Special" (player) / null (team);
  vibe → "Vibe". Single source for every label surface.
- **Drop specialist for teams**: `card-registry.tsx` specialist entry gains
  `showFor: type === "player"` (removes the tab + preload for teams); `EntityMeta` gates the
  specialist score cell to players; the OG meta body omits specialist for teams.
- **Threaded the labels** through every surface: NavStrip (`ContentShell`), the Composite
  card heading + facet/scoped labels (`CompositeCard`), the meta widget scores
  (`EntityMeta`), the Starline headline + legend (`TrendsCard`), and the OG headings —
  composite body takes a `heading` prop ("GENERAL"/"RATING"), specialist body → "SPECIAL",
  meta body labels via the resolver.
- `shareCategory` for specialist → "special".

## Files Changed

`lib/cards/card-meta.ts`, `lib/cards/og-bodies.ts`, `lib/cards/bodies/{composite,specialist}.ts`,
`components/solid/{card-registry,ContentShell,CompositeCard,EntityMeta,TrendsCard}.tsx`.

## Verification

`npm run typecheck` clean; `npm test` 97/97; `npm run build` clean. Live: player cards/OG
read General/Special/Vibe; team cards/OG read Rating/Vibe with no specialist tab/cell.

## Result

Players: General · Special · Vibe. Teams: Rating · Vibe. One `pillarLabel` resolver drives
the nav, the cards, the meta widget, the Starline, and the OG share headings — consistent
everywhere. (Internal engine names — composite/specialist — unchanged.)
