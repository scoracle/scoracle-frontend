# 2026-05-23 — Stats is the default landing tab; reorder profile nav

## Goal

The rated value (the Stats card's per-category overall ratings + the
meta-card Rating readout) is the platform's headline output — the
single greatest piece of value Scoracle hands a user on profile load.
It should be the first thing they see. Until today the profile route
defaulted to Articles, which buried the rating one click away.

Make Stats the default landing tab on `/profile`, and reorder the
NavStrip to lead with it: **Stats, Articles, Vibes, X, Traits, Trends,
Compare**.

## What Was Done

`src/lib/utils/profile-tabs.ts`:
- `DEFAULT_TAB: ProfileTab = "news"` → `"stats"`.
- `VALID_TABS` set re-ordered to match the new nav order (Stats first).
- Docstring on `deriveInitialTab` now names "stats" as the locked
  default and explains why (rated value is the headline output).

`src/lib/utils/profile-tabs.test.ts`:
- Default-fallback assertions now expect `"stats"` instead of `"news"`.
- The "every valid tab value through unchanged" case now covers all
  seven tabs (it was missing `trends`, which had been silently
  uncovered since the Trends card landed).

`src/components/solid/ContentShell.tsx`:
- `PANES` and `NAV_ITEMS` re-ordered to Stats / Articles / Vibes / X /
  Traits / Trends / Compare. This is the visible left-to-right strip
  order *and* the sticky-mount priority.
- Header docblock updated: seven panes, Stats-first, with a sentence
  on why.

`src/contexts/profile.ts`, `src/routes/profile.tsx`:
- Stale "six sibling panes" / "six sibling Cards" comments updated to
  seven, with the new ordering. Profile route docstring also notes
  the new "opens on stats default" behaviour.

No data-flow change: `firePreloads` already fires every Card's query
on profile mount, so the Stats query is already warm by the time the
route renders — landing on Stats by default doesn't add a fetch hop
on the cold path.

## Files Changed

- `src/lib/utils/profile-tabs.ts`
- `src/lib/utils/profile-tabs.test.ts`
- `src/components/solid/ContentShell.tsx`
- `src/contexts/profile.ts`
- `src/routes/profile.tsx`

## Verification

- `npm run typecheck` — clean.
- `npm test` — 131/131 green (the profile-tabs suite picked up one
  extra assertion from the trends-coverage fix, hence 131 vs. 130
  before).

UI not opened in the browser this commit — the change is a one-line
default flip plus a static array re-order, and the test suite already
exercises both.

## Result

A cold visit to `/profile?sport=NBA&type=player&id=237` now lands on
the Stats card with the Rating chip already populated in the meta
header above it. The NavStrip reads left-to-right:
`Stats Articles Vibes X Traits Trends Compare`. Deep-link URLs
(`&tab=vibes` etc.) still honour the named tab unchanged.
