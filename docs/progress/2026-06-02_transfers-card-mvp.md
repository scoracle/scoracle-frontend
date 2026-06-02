# 2026-06-02 — Transfers/Trades card (heat MVP)

## Goal

Frontend half of the Transfers/Trades MVP (plan
`~/.claude/plans/zany-dazzling-hamster.md`, Phase 1): a team-profile tab listing
rumor-linked players ranked by the deterministic heat index, each linking to
their Specialist breakdown. Renders on heat alone (Gemma vetting fills the
stage/summary later).

## What Was Done

- `lib/utils/data-sources.ts`: `transfersUrl(sport, id)`.
- `lib/data/transfers.server.ts`: `getTransfers` (404→null) + typed `TransferRumor[]`
  (heat, heat_components, plus nullable direction/stage/gemma_summary/source_attribution
  for Phase 2).
- `components/solid/TransfersCard.tsx` + `.css`: ranked list reusing `RatingList.css`;
  each row = rank · player name (→ `/profile?...&type=player&id=`) + a meta sub-line
  (stage + grounded summary + "per [source]", graceful "Reported"/"Speculation" until
  Gemma) · heat (tier-colored). **Sport-aware heading**: "Transfers" (football) /
  "Trades" (nba/nfl).
- Registered the `transfers` tab (team-only via `showFor`) in `profile-tabs.tsx`,
  `ProfileTab` union, and `VALID_TABS`; preload warms `getTransfers`.

## Files Changed

```
src/lib/utils/data-sources.ts                 (transfersUrl)
src/lib/data/transfers.server.ts              (NEW)
src/components/solid/TransfersCard.tsx + .css  (NEW)
src/contexts/profile.ts · src/lib/utils/profile-tabs.ts · profile-tabs.tsx
```

## Verification

- `npm run typecheck` clean; `npm run test` 141/141 (preload registry-sync test green).
- SSR (`?tab=transfers`, Chelsea team 18): 26 rows, real rumors (Elliot Anderson,
  Jarrod Bowen) + heat values (60/55/44…), 25 player links resolving to profiles,
  "Speculation" stage on every row, no errors; team-only tab present.
- NBA team: card heading relabels to "Trades".

## Result — MVP in, KNOWN follow-ups

- Heat-only includes current-roster co-mention noise (Cucurella, Palmer) — Phase 2
  Gemma `is_rumor` filter cleans it.
- The **nav label is static "Transfers"** (registry `label: string`) while the card
  heading relabels to "Trades" for nba/nfl — a minor inconsistency; making the nav
  label sport-aware is a follow-up (label-as-function).
- Direction/stage/summary/source are nullable placeholders until Phase 2 (Gemma).
