# Unify Transfers card — drop "Suitors"

## Goal
Retire the player-only "Suitors" feature/language. One **Transfers** card now serves
**any** entity type — a team's incoming/outgoing players AND a player's interested
clubs — folded onto the news rail like the other rail cards.

## What Was Done
- **TransfersCard.tsx** — unified for any entity. `TransferRow` takes a
  `counterpartyType: "player" | "team"`; `counterpartyHref` links to the OTHER entity
  type (a team's rows → players, a player's rows → clubs). Team crests render square
  (`transfers-avatar-team`), player headshots round. Card derives `counterpartyType`
  from `type()` and reads `getNewsRail().transfers`.
- **NewsCard.tsx** — passes `counterpartyType` to `<TransferRow>` in the Transfers scope.
- **card-registry.tsx** — merged the two split entries (team-only `transfers` +
  player-only `suitors`) into ONE `transfers` entry with no `showFor` (shown for every
  entity). Dropped the `PlayerSuitorsCard` import.
- **PlayerSuitorsCard.tsx** — deleted.
- **profile-tabs.ts** — removed `"suitors"` from `VALID_TABS`; added `suitors → transfers`
  to `TAB_ALIASES` so old `?tab=suitors` deep links still land.
- **contexts/profile.ts** — dropped `| "suitors"` from the `ProfileTab` union.
- **card-meta.ts / ContentShell.tsx / data-sources.ts** — removed the `suitors` CARD_META
  entry, the `t.id === "suitors"` nav branch, and the dead `suitorsUrl` helper.
- Comment cleanups ("Transfers/Suitors cards" → "Transfers card"; "suitor clubs" →
  "interested clubs") across GemmaSummary, news-rail.server, TransfersCard.

## Files Changed
ContentShell.tsx, GemmaSummary.{tsx,css}, NewsCard.tsx, TransfersCard.{tsx,css},
card-registry.tsx, contexts/profile.ts, lib/cards/card-meta.ts,
lib/data/news-rail.server.ts, lib/utils/data-sources.ts, lib/utils/profile-tabs.ts;
deleted PlayerSuitorsCard.tsx.

## Verification
`npm run typecheck` clean · `npm run build` clean · `npm test` 113/113 pass.

## Result
Single direction-agnostic Transfers card (sport-aware "Transfers"/"Trades" label).
No user-facing "Suitors" language remains; the only residual `suitors` token is the
backward-compat URL alias.
