# Vibes Synthesis + Sigil Rename

**Date:** 2026-06-16

## Goal

- Rename "Special/Specialist" to "Sigil" throughout the frontend.
- Update the Vibe card to read from the new `vibe_synthesis` backend table: `score` (was `sentiment`), `blurb` (new), `previous_score` (new).
- Surface Gemma's divined Sigil label on the Sigil card hero.
- Update the Trends card to use the renamed `entity_season_sentiment_series` key.
- Remove the Sigil card's player-only gate (team parity).

## What Was Done

**Sigil rename (Special → Sigil):**
- Renamed files: `special.server.ts` → `sigil.server.ts`, `SpecialistCard.tsx` → `SigilCard.tsx`, `SpecialistCard.css` → `SigilCard.css`, `specialist-art.tsx` → `sigil-art.tsx`, `cards/bodies/specialist.ts` → `cards/bodies/sigil.ts`
- Updated all internal types/imports: `SpecialRating`→`SigilRating`, `SpecialResponse`→`SigilResponse`, `getSpecial`→`getSigil`
- `card-registry.tsx`: entry `id: "specialist"` → `"sigil"`, label `"Sigil"`, removed `showFor: player` gate
- `profile-tabs.ts`: `"specialist"` → `"sigil"` in `VALID_TABS`; added `"specialist": "sigil"` alias for backward-compat deep links
- `card-meta.ts`: pillar label case `"specialist"` → `"sigil"`
- `og-bodies.ts`, `data-sources.ts`, `share-url.ts`: all references updated
- `SigilCard.tsx` hero: renders `commentary?.divined_sigil` (Gemma-divined label, prompt s3+) falling back to the engine's breakdown label

**Vibes update:**
- `vibes.server.ts`: `VibeCurrent.sentiment` → `score`; added `blurb: string | null`, `previous_score: number | null`; `VibePoint.sentiment` → `score`
- `VibeCard.tsx`: all `v.sentiment`/`row.sentiment` → `score`; added blurb render between archetype name and subtext
- `VibeCard.css`: added `.vibe-blurb` style (italic, secondary text, centered, 26rem max-width)
- `EntityMeta.tsx`, `og-bodies.ts`: `v.sentiment` → `v.score`

**Trends rename:**
- `TrendsCard.tsx`: `entity_season_vibe_series` → `entity_season_sentiment_series`; label hardcoded `"Sentiment"`
- `trends.server.ts`: `TrendsVibeSeriesDay` → `TrendsSentimentSeriesDay`; series key renamed

**Sigil divined label:**
- `sigil.server.ts` `StatCommentary`: added `divined_sigil: string | null`

## Files Changed

```
src/lib/data/vibes.server.ts
src/lib/data/sigil.server.ts              (was special.server.ts)
src/lib/data/trends.server.ts
src/lib/data/stats.server.ts
src/lib/data/roster.server.ts
src/components/solid/VibeCard.tsx
src/components/solid/VibeCard.css
src/components/solid/SigilCard.tsx        (was SpecialistCard.tsx)
src/components/solid/SigilCard.css        (was SpecialistCard.css)
src/components/solid/sigil-art.tsx        (was specialist-art.tsx)
src/components/solid/TrendsCard.tsx
src/components/solid/EntityMeta.tsx
src/components/solid/card-registry.tsx
src/lib/cards/bodies/sigil.ts             (was specialist.ts)
src/lib/cards/card-meta.ts
src/lib/cards/og-bodies.ts
src/lib/router/profile-tabs.ts
src/lib/router/share-url.ts
src/lib/data/data-sources.ts
src/lib/data/leaderboard.server.ts        (audit fix — see below)
```

**Pre-deploy audit fix.** `leaderboard.server.ts`'s `LeaderboardEntry` still declared the old
`rating_specialist` / `rating_specialty` / `rating_specialist_rank` / `rating_specialist_score`
fields — a type-lie the rename sweep missed (nothing read them yet, so no runtime break, but the
backend emits `rating_sigil*`). Renamed to `rating_sigil` / `rating_sigil_label` / `rating_sigil_rank`
/ `rating_sigil_score`. The same audit reversed the backend's column rename in favor of read-layer
aliasing (engine keeps `rating_specialist*` columns; the wire still sends `rating_sigil*`), so **no
other frontend change was needed** — the frontend's `sigil`-keyed expectations (including the
`rating_modes` `RatingModeBlock`) are met by the backend aliases + JSON-key remap. See the backend
[[Session - Vibes synthesis + Sigil rename]] for the full audit.

## Verification

- `npm run typecheck` — clean
- `npm test` — 113/113 passed (archetypes, reversal, profile-tabs alias, share-url, stats)

## Result

Sigil card is fully renamed and team-parity enabled; VibeCard renders holistic synthesis score + blurb; Trends labels sentiment as "Sentiment"; `?tab=specialist` deep links alias to `sigil`. Ready for backend migration + binary deploy (migrations 088–091).
