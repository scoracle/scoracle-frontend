# 2026-06-02 — Profile reframe: Composite/Specialist cards, meta 3-score row, tab relabel (Phases 2–5)

## Goal

Frontend half of the profile reframe (plan `~/.claude/plans/zany-dazzling-hamster.md`),
on top of the backend `rating_breakdown` foundation. Make Composite / Specialist
/ Vibes the three pillars, driven by the z-score engine's datapoints. **Plumbing
session** — functional structure to debug + polish tonight.

## What Was Done

**Phase 2 — CompositeCard** (`CompositeCard.tsx`). PizzaChart fed by
`rating.rating_breakdown.filter(in_comp)`: each wedge sized/colored by its 0–100
`pct`, raw signed z as the wedge sub-label. NFL composites are facet-balanced, so
NFL players get one pizza per facet (Offense/Defense/Special); NBA/FOOTBALL +
teams get one. Headline "Composite NN" = `rating_composite_rank`. Reuses
`PizzaChart` / `tierColor` / `Shell` / StatsCard CSS.

**Phase 3 — SpecialistCard** (`SpecialistCard.tsx` + `.css` + `lib/utils/specialist-art.tsx`).
Hero = the `is_specialty` datapoint with an illustration + scarcity copy tiered on
`rating_specialist_rank` (≥99 → "the single most valuable skill in the sport"). A
secondary grid shows the other `in_spec` skills by `pct`. Art registry is
placeholder monograms keyed by datapoint label — real illustrations slot into
`ART` later; `placeholderFor` guarantees no blank.

**Phase 4 — Meta 3-score row** (`EntityMeta.tsx` + `.css`). A `.pw-scores` row
(Composite | Specialist | Vibe) under the logo, above the metadata. Reads
`getStarline().rating` for Composite/Specialist ranks (replacing the old
`getStats().meta.season_composite_rank` "Rating" chip — the percentile composite
is retired from the UI) + the existing `getVibe()` sentiment.

**Phase 5 — Tab relabel + deep-link compat.** Stats→Composite, Trends→Starline,
added Specialist, dropped Traits. New order: Composite · Specialist · Starline ·
Vibes · News · Leaders (+ Roster for teams). `deriveInitialTab` aliases retired
ids forward (`stats|traits|compare → composite`, `trends → starline`) so old
deep links + share URLs resolve. Updated `ProfileTab` / `ShareTab` unions,
`VALID_TABS`, both tab tests, ContentShell + CLAUDE.md docs.

## Files Changed

```
src/components/solid/CompositeCard.tsx        (NEW)
src/components/solid/SpecialistCard.tsx + .css (NEW)
src/lib/utils/specialist-art.tsx              (NEW)
src/components/solid/EntityMeta.tsx + .css     (3-score row; getStarline)
src/components/solid/profile-tabs.tsx          (registry: composite/specialist/starline; drop traits)
src/contexts/profile.ts                        (ProfileTab union)
src/lib/utils/profile-tabs.ts                  (VALID_TABS, DEFAULT_TAB=composite, alias map)
src/lib/utils/share-url.ts                      (ShareTab union)
src/components/solid/ContentShell.tsx           (header doc)
src/lib/utils/profile-tabs.test.ts · share-url.test.ts · lib/share/text.test.ts  (new ids)
CLAUDE.md                                       (vocabulary + tab list)
```

## Verification

- `npm run typecheck` clean; `npm run test` → **141 passed** (tab + preload + share tests).
- SSR-render (live API): `?tab=composite` (NBA single pizza + Rim Protection datapoint;
  NFL 3 facet pizzas Offense/Defense/Special), `?tab=specialist` (hero + "most valuable
  skill in the sport" + art), meta row shows Composite·Specialist·Vibe, nav = new labels
  (no Stats/Trends/Traits), old `?tab=stats` → composite, team keeps Roster.

## Result — plumbing in, KNOWN follow-ups for tonight

- **Compare mode** deferred on Composite (ButterflyChart untouched; `?vs=` now inert).
- **Specialist art** = placeholder monograms; real illustrations + scarcity-tier tuning pending.
- **Layout/spacing** on all three new surfaces is rough — needs a polish pass.
- **Orphaned (not deleted):** `StatsCard.tsx`, `TraitsCard.tsx`, the `stats-categorizer`
  category exports — dead-code prune is a safe follow-up.
- **OG images** for composite/specialist/starline render the placeholder (cardType is the
  tab id; no real OG artifact yet).
- Old percentile-composite backend pipeline is intact, now UI-orphaned (intentional).
