# Phase 2 — Frontend rotated to Rating / Vibe / Momentum / Sigil

**Date:** 2026-06-18
**Scope:** Bring the Sigil-convergence vocabulary to the profile page, start to finish.
**Commit:** `7a7aff7` (origin/main). Deploy to scoracle.com pending authorization.

## Goal

Rotate the flagship's profile vocabulary to the [[Sigil]] model: two rails end in
**Rating** (statistical) and **Vibe** (emotional), their trajectories combine into
**Momentum**, and all converge into the crown **Sigil**.

## What Was Done

- **Cards renamed** (files + symbols + CSS): `CompositeCard→StatsCard` ("Stats"),
  `SigilCard→RatingCard` ("Rating"), `VibeCard→SigilCard` (the crown synthesis),
  `TrendsCard→MomentumCard`.
- **Ids rotated** across the whole control plane (composite→stats, sigil→rating,
  vibes→sigil, trends→momentum): `ProfileTab`/`CardId` union, `CARD_REGISTRY`,
  `card-meta` (pillarLabel + CARD_META), `og-bodies` (OG routing + bodies),
  `share-url`, `data-sources` product union, `profile-tabs` aliases (+ deep-link
  back-compat) and `deriveInitialTab` default (`stats`).
- **Fetchers:** `getSigil→getRating` (`/rating`), `getVibes→getSigil` (synthesis),
  `getTrends→getMomentum` (`/momentum`); `rating.server` gained `rating_composite_score`
  + `rating_composite_rank` (served by the backend `entity_sigil` add).
- **Rating card** now headlines the **positionless magnitude** (composite score for
  players / rank for teams) + the divined strength + the Gemma identity blurb —
  symmetric with the Vibe (sentiment + prompt).
- **Meta** layout → **Rating · [Sigil centred + larger] · Vibe**; the Vibe (sentiment)
  score is drawn from the momentum series' latest day.
- **Momentum** relabels its vibe trajectory line "Vibe".
- **Transfers folded into News** as a selectable scope (reuses `<TransferRow>`); the
  standalone Transfers tab is gone (the `transfers` CardId survives for the
  /leaderboard board + share/OG).
- Tests + OG bodies + doc comments updated to the new vocabulary.

## Files Changed

~40 files under `src/` (card components + CSS, control-plane maps, fetchers, EntityMeta,
NewsCard scope, tests). Renames tracked by git.

## Verification

- `npm run typecheck` clean (0 errors); `npm test` 113/113 pass; `npm run build` OK.
- Dev SSR smoke (against the live API): `/profile` 200 with nav **Stats · Rating · News
  · Momentum · Sigil** and Meta **Rating · Sigil · Vibe**; `/leaderboard` + `/` 200; no
  runtime errors.

## Result

The flagship profile reads in the Rating/Vibe/Momentum/Sigil vocabulary end to end,
on `origin/main`. **Pending:** `npm run cf:deploy` to ship to scoracle.com (awaiting
go-ahead). Remaining Sigil work after deploy: Phase 3 (repoint `/sigil`→synthesis,
retire `/trends`/`/vibes`) and the backend D1 `rating_sigil*→rating_peak*` alias +
the rating-prompt strengths-emphasis tweak.
