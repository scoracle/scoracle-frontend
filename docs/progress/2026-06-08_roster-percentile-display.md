# Roster card: season percentile instead of z-score

**Goal**
The team Roster card's COMP/SPEC columns showed raw Composite/Specialist z-scores
(e.g. `+15.9`, `+3.5`). Display the actual 0-100 season percentile instead, so the
card reads consistently with the Composite and Specialist cards.

**What Was Done**
The roster endpoint already returns `rating_composite_rank` / `rating_specialist_rank`
(0-100 positionless season percentiles) — the card fetched them but never rendered
them, showing the raw `rating_composite` / `rating_specialist` z-scores instead.
Switched the two score cells to render the `_rank` fields, and replaced the
sign-prefixing `z()` formatter with a bare `pct()` formatter (`v.toFixed(1)`, no
`+`/`-`), identical to how CompositeCard/SpecialistCard display percentiles. Roster
ordering (by the sum of the underlying Composite+Specialist z-scores) is unchanged —
only the displayed number changed. No data-layer, type, or backend change needed.

**Files Changed**
- `src/components/solid/RosterCard.tsx` — `z()` → `pct()`; render
  `rating_composite_rank` / `rating_specialist_rank` in the COMP/SPEC columns.
- `docs/progress/2026-06-08_roster-percentile-display.md` — this doc.

**Verification**
- `npm run typecheck` (tsc --noEmit) — clean. The rank fields are already typed
  `number` on `RosterPlayer`.
- `npx vitest run src/lib/utils/profile-tabs.test.ts` (the only roster-adjacent
  test) — 4 passed. No test asserted the old z-score display, so nothing else
  needed updating.
- Change applied to the live main checkout; dev server picks it up via HMR.

**Result**
Roster COMP/SPEC columns now read as 0-100 season percentiles, consistent with the
Composite/Specialist cards.
