# Two-rail dead-code sweep

## Goal
Audit the two-rail migration for cleanliness and remove the orphaned helpers/files
that nothing calls anymore (the fold itself was already correct — this is source
hygiene, since Vite already tree-shakes unused exports out of the deployed bundle).

## What Was Done
- **Deleted `src/lib/data/transfers.server.ts`** — its `getTransfers` query fetcher had
  zero callers (the Transfers card reads `getNewsRail` now). Moved the two still-used
  types (`TransferRumor`, `TransferHeatComponents`) into `news-rail.server.ts` — the rail
  owns its transfer scope — and repointed `TransfersCard`'s import. Dropped the
  unused `TransfersResponse`.
- **Deleted `src/lib/data/twitter.server.ts`** — `getTwitterStatus` / `getTwitterFeed`
  have no importers (Twitter was removed from the pipeline; the news feed folded into
  the rail).
- **Trimmed `src/lib/utils/data-sources.ts`** — removed the helpers whose only consumers
  were the deleted modules: `transfersUrl`, `twitterStatusUrl`, `twitterEntityFeedUrl`,
  `teamResultsUrl` (results.server.ts was deleted in Tier 1), plus the unused
  `entityUrl`, `unwrapEntityPayload`, and the `GoEntityEnvelope` interface.

## Deliberately kept (verified live, not dead)
- `getBaseUrl` (15 internal callers), `getVibe`/`vibeUrl` (EntityMeta corner score + OG
  share render — a lightweight fetch kept separate from the heavier rail so the
  always-visible meta shell doesn't force the rail to load eagerly), `newsUrl` +
  `co-mentions.ts` (CoMentionsCard is intentionally disconnected-but-preserved per CLAUDE.md).

## Files Changed
Deleted: data/transfers.server.ts, data/twitter.server.ts. Modified:
data/news-rail.server.ts (+types), components/solid/TransfersCard.tsx (import),
lib/utils/data-sources.ts (−7 dead exports).

## Verification
No lingering refs to any deleted symbol · `npm run typecheck` clean · `npm run build`
clean · `npm test` 113/113. No runtime/bundle change (orphans were already tree-shaken).

## Result
Every profile card folds onto exactly one shared fetch (`getNewsRail` / `getSparkline`
/ `getTrends` / `getRoster`); the data layer carries no orphaned fetchers or URL helpers.
