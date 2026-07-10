# 2026-07-03 — Profile card aesthetic audit

## Goal

Doctrine audit of the `/profile` card surfaces (Meta, Stats, Rating, News,
Trends, Sigil, Roster + shared Shell chrome and empty/loading states) against
`../scoracle-tokens/AESTHETIC_VISION.md` and
`../scoracle-wiki/PRODUCT_NARRATIVE.md`.

## What Changed

Audit only — no code changes. Findings written to
`docs/audits/2026-07-03_profile-card-aesthetic-audit.md`.

Headline findings:

- Corner expression falls to decorative dots on 5 of 7 cards (doctrine says
  data-bearing when possible).
- Hero-score type treatment varies per card, including a bolded display face
  on Trends (explicit doctrine violation).
- Micro-labels have re-drifted into ~8 one-off size/tracking cuts.
- Loading skeletons are SaaS pulses; doctrine assigns loading/null to the
  deck-back art (which ships unused).
- EmptyCard's "(no mentions found)" default leaks news vocabulary onto
  stats/roster empty states.
- SigilCard is visually identical in weight to the null state and labels
  itself "Vibe" in aria strings — the crown card neither peaks nor names
  itself.
- MomentumCard headlines state, not trajectory — misaligned with the
  narrative's "directional force, not overall quality".

## Files Changed

- `docs/audits/2026-07-03_profile-card-aesthetic-audit.md` (new)
- `progress_docs/2026-07-03_profile-card-aesthetic-audit.md` (this doc)

## Verification

Documentation only; no build/test impact.

## Result

Prioritized P1/P2/P3 backlog in the audit doc — P1 items are one-line-to-
small diffs (corner labels, empty-note default, weight fix, roster color
coherence, news un-stick, Sigil aria rename).

## Follow-Up

- Execute P1 items in a follow-up session.
- Micro-label consolidation (P2) should be coordinated with
  `scoracle-tokens`, which owns type roles.
- Trends-as-trajectory (P3) needs a data-contract check on the momentum
  payload (direction + trajectory score).
