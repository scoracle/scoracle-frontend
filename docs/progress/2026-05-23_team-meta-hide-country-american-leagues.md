# 2026-05-23 — Hide Country row on NBA / NFL team meta

## Goal

NBA and NFL teams all share the same country (USA) — surfacing
"Country: United States" on every Hawks / Cardinals / etc. profile is
zero-information noise. Drop the row for those leagues; keep it for
Football, where teams genuinely span countries (Premier League,
Bundesliga, La Liga, etc.).

## What Was Done

`EntityMeta.tsx`:
- `buildTeamDetails(meta)` → `buildTeamDetails(meta, sport)`. Skip the
  `Country` row when `sport.toUpperCase()` is `NBA` or `NFL`.
- `resolveTeam(meta)` → `resolveTeam(meta, sport)`; sport threaded
  through to `buildTeamDetails`. Single in-file caller updated.

Backend payload + bundled JSON unchanged — `meta.country` still ships
for every team, it just doesn't surface in the UI for single-nation
leagues. Keeps the data layer simple and easy to re-expose if we ever
care to differentiate (e.g., Toronto Raptors as "Canada" — currently
the backend still ships "United States" for them; if that's worth
distinguishing later, this gate is the single line to flip).

## Files Changed

- `src/components/solid/EntityMeta.tsx`

## Verification

- `npm run typecheck` — clean.
- `npm test` — 137/137.

## Result

NBA / NFL team profiles no longer render "Country: United States" in
the meta detail block. Football team profiles still show their
country, distinguishing Premier League / Bundesliga / La Liga teams.
