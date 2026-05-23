# 2026-05-23 — TrendsCard redesign: top/bottom split + drop %deltas

## Goal

Four asks from hands-on testing of the live TrendsCard:

1. **Label each section by type.** With two columns of numbers and only
   date/range headers, users couldn't tell which side was vibes and
   which was stats.
2. **Drop noise.** The `Cohort · n=31` and `newest first` footer
   captions read as muttering — no actual reading benefit.
3. **More breathing room.** Vertical split (left column + right column)
   crammed each side into half the Shell width; horizontal split
   (top row + bottom row) gives every row the full Shell width.
4. **More consumable stat numbers.** `+107%` jumps off tiny baselines
   (0.16 → 0.33) and `−100%` decreases off zero recent values were
   technically correct but actively misleading.

## What Was Done

`src/components/solid/TrendsCard.tsx`:

- **Layout flipped 90°.** Two sections stacked vertically: Vibes on
  top, Stats on bottom, with a horizontal hairline divider between.
- **Section labels** now lead with the section type (`Vibes`,
  `Stats`) in slightly heavier weight, then the range qualifier
  (`Last 7 Days`, `Last 3 Games`) in lighter trailing text. Single
  line, small caps, centered.
- **Percentage delta dropped** from every stat row. The row is now
  `[stat label] [recent value, tier-colored] [vs peer.NN]`. The tier
  color on the recent value carries the magnitude signal exactly like
  every other percentile-tier surface in the app (green = above
  cohort, red = below); the peer baseline gives concrete grounding.
  No more `+107% / −100%` math-on-tiny-numbers noise.
- **Footer captions removed** (`Cohort · n=31` and `newest first`).
- `StatRow` interface gains `peer: number` so the row can render the
  baseline. `buildStatRows` populates it from `peer_season_avgs[key]`.
- `formatDelta` function deleted (no consumers).
- `cohortCaption` memo deleted (no consumers).
- Single-column collapse class also retired (no longer needed — the
  layout is always vertically stacked, and the divider already
  conditionally renders when both sections are present).

`src/components/solid/TrendsCard.css`:

- `.trends-card` now `display: flex; flex-direction: column` (was
  `grid-template-columns: 1fr 1px 1fr`).
- `.trends-divider` becomes a horizontal hairline (height: 1px;
  width: 100%).
- `.trends-section` (was `.trends-col`) drops min-width:0
  defensiveness — full Shell width is always available.
- New `.trends-section-label` typography with `.trends-section-type`
  modifier for the bold lead-in.
- New `.trends-stat-peer` style for the `vs N.NN` baseline: 0.78rem
  italic, tertiary-text color, right-aligned.
- Footer rules and the @media (max-width: 480px) column-collapse rule
  retired (no longer needed).

Skeleton updated to mirror the new top/bottom layout.

## Files Changed

- `src/components/solid/TrendsCard.tsx`
- `src/components/solid/TrendsCard.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 131/131

UI not opened in the browser this commit.

## Result

The TrendsCard is now legibly labeled (Vibes / Stats), uses the full
Shell width per section, and never shows a misleading percentage. The
recent value's tier color tells the user how the entity compares to
its cohort; the peer baseline next to it grounds the comparison in
real numbers.
