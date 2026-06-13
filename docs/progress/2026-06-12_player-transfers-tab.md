# Player Transfers tab (suitors)

## Goal
Expand the Transfers feature to player entities: a new profile tab that lists the
teams linked with a player ("who's after them"), mirroring the team Transfers tab.
The backend already shipped the data — `GET /api/v1/{sport}/player/{id}/suitors`
(`GetPlayerSuitors` / `player_suitors`) — so this was frontend wiring only.

## What Was Done
- **Data layer**: `suitorsUrl()` in `data-sources.ts` (mirror of `transfersUrl`);
  new `data/suitors.server.ts` with `getSuitors` query + `SuitorsResponse`/`PlayerSuitor`
  types (the suitor row is a TEAM — same heat/stage/summary shape as `TransferRumor`,
  reusing `TransferHeatComponents`).
- **Card**: new `PlayerSuitorsCard` — the player-side mirror of `TransfersCard`. Each
  row links to the suitor **team's** profile and carries the same tier-colored stage
  line + breathing `<ClampedSummary>` from the breathe pass. Reuses `TransfersCard.css`.
- **Registration**: a `suitors` entry in `CARD_REGISTRY` (`showFor: player`, preloads
  `getSuitors`); `ContentShell` extends the sport-aware label remap to `suitors` so the
  tab reads "Transfers"/"Trades"; `ProfileTab` union, `VALID_TABS` (so `?tab=suitors`
  deep-links), and `CARD_META` all gain the entry. `firePreloads` already gates on
  `showFor`, so teams don't mis-preload it.

## Files Changed
- `src/lib/data/suitors.server.ts` (new), `src/components/solid/PlayerSuitorsCard.tsx` (new)
- `src/lib/utils/data-sources.ts`, `src/components/solid/card-registry.tsx`
- `src/components/solid/ContentShell.tsx`, `src/contexts/profile.ts`
- `src/lib/utils/profile-tabs.ts`, `src/lib/cards/card-meta.ts`

## Verification
- `npm run typecheck` clean · `npm test` 119/119 · `npm run build` OK.
- Live `/api/v1/football/player/96353/suitors` → 5 teams (Real Madrid, Atlético,
  Barcelona, Inter, Juventus) — the tab renders these as team rows.

## Result
Every player profile gains a Transfers (Trades) tab listing who's after them, with
the empty state for players with no live links. Not yet pushed/deployed — gated on Scott.
