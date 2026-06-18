# Leaderboard board model + Phase 3 crown cutover

**Date:** 2026-06-18
**Scope:** Frontend half of the leaderboard board model + the Phase 3 /sigil cutover.
**Commits:** `3b16fcb` (leaderboard), `54f27d1` (crown→/sigil) — origin/main. Deployed (Worker `0b869f95`).

## What Was Done

- **Leaderboard rail → Rating · News · Vibe · Transfers** (renamed "Vibes"→"Vibe", reordered; Fantasy
  off the visible rail, still URL-reachable via `?board=fantasy`). The **Vibe board surfaces the Vibe end
  product** — sentiment as the metric + the felt-read prompt as the expandable blurb (its only public
  surface, since Vibe has no profile card). New `VibeLeader` type (BoardEntry + blurb).
- **Phase 3 cutover:** the crown `getSigil` fetcher now reads the canonical `/sigil` path (which serves
  the synthesis post-repoint) instead of the `/vibes` alias. Data identical.

## Verification

- tsc clean · 113 tests · build OK · deployed.
- Live (scoracle.com): profile nav Stats · Rating · News · Momentum · Sigil; Meta Rating · Sigil · Vibe;
  leaderboard rail Rating · News · Vibe · Trades (NBA) / Transfers (football); all 200.

## Result

The flagship's Sigil convergence is end-to-end live: the profile cards, the Meta, the leaderboard boards,
and the crown's canonical `/sigil` path all read in the Rating/Vibe/Momentum/Sigil vocabulary.
