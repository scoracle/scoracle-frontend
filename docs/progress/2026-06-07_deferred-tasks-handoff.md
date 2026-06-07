# 2026-06-07 — Handoff: deferred tasks #17, #22, #23

Detailed start-cold notes for the three tasks left open after the 2026-06-05/07 session.
Each is either a large refactor or a production-ranking change that wants its own focused
session. Investigation is current as of these dates — re-verify file:line before editing.

---

## #22 — Football rating: position-aware datapoints (engine recompute)

**Status:** the user-visible problem is already mitigated **display-only** (frontend), shipped
2026-06-05/07. This task is the proper **engine** fix, which corrects the underlying VALUES and
composites. **It re-rates production football → every football composite + leaderboard shifts.**
Needs Scott's go-ahead AND a datapoint-split decision before running.

### Root cause
Football is rated positionless with **goalkeepers in the same pool** as outfielders. The GK
datapoints — `Shot-Stopping` (saves), `Penalty Saves` (penalties_saved), `Punching` (punches),
`High Claims` (good_high_claim) — are `in_comp = TRUE`, so:
- an outfielder's 0 saves **drags their Composite down**, and shows as 0-pct specialist weaknesses;
- a keeper's 0 goals/dribbles drags theirs;
- `Penalties Won` is `sign = +1` (already positive, NOT a negative) but `in_spec`, so it reads as
  a weakness for players who draw 0.

### Where it lives (scoracle-backend, Postgres owns the math)
- Datapoint config: **`rating_datapoints(p_sport TEXT, p_stats JSONB)`** — latest definition in
  `sql/migrations/041_penalties_won.sql` (returns `label, value, in_comp, in_spec, sign, facet`).
  The FOOTBALL block is the positionless VALUES list; GK rows + `Penalties Won` are in it.
  (Earlier defs: 027, 037 — 041 is current.)
- It's invoked as `CROSS JOIN LATERAL rating_datapoints(p_sport, ps.stats)` in:
  `027_rating_engine_z.sql` (compute_rating), `030_rating_breakdown.sql`, `038_rating_breakdown_value.sql`,
  `039_rating_scoped_ranks.sql` (current compute_rating + scoped ranks). Team variant:
  `rating_datapoints_team`.
- Player position is on `player_stats.position` (NOT passed into `rating_datapoints` today).

### The fix (proposed)
Make `rating_datapoints` position-aware: add a `p_position TEXT` (or `p_is_gk BOOLEAN`) arg and
gate the football rows. **Decision required — the GK / outfield / shared split**, e.g.:
- GK-only: Shot-Stopping, Penalty Saves, Punching, High Claims (+ maybe goals_conceded/save_pct).
- Shared (both): Passing (the frontend already shows GKs `{GK stats + Passing}`), maybe Tackling?
- Outfield-only: everything else (Goalscoring, Creation, Shooting, Dribbling, Duels, …).
- `Penalties Won`: the user wants it demoted to display-only → set `in_spec = FALSE` (this is the
  backend half of **#20**). Decide whether to keep it as a team offense composite term (it is today).
Then propagate the new arg to ALL callers above (pass `ps.position`), in a new migration.

### Recompute (the ranking-shifting part)
Re-rate every football season after the config change (pattern is in 041's trailing `DO $$`):
```
FOR s IN SELECT DISTINCT season FROM player_stats WHERE sport='FOOTBALL' LOOP PERFORM compute_rating('FOOTBALL', s); END LOOP;
FOR s IN SELECT DISTINCT season FROM team_stats   WHERE sport='FOOTBALL' LOOP PERFORM compute_team_rating('FOOTBALL', s); END LOOP;
```
**Pre-flight** the new SQL with the throwaway `db.New`-style cmd (prod DB read is classifier-gated —
needs the user to authorize). Then `systemctl --user restart scoracle-api.service` (path-watcher is
inert; restart manually — see memory `backend-api-restart-mechanics`).

### After: revisit the frontend display-only filters
Once the engine is position-aware, the frontend SpecialistCard/CompositeCard football filters
(`GK_LABELS` / `nflSideOfBall` style) may be redundant — but keep them unless verified, since the
engine still pools cohorts for percentile *population* unless that's also addressed.

---

## #17 — In-app Canvas convergence (one body, two render paths)

**Goal:** one body definition per card, rendered two ways — DOM (in-app) and SVG (OG/share) —
instead of maintaining each card twice. Today the in-app `*Card.tsx` (DOM) and the OG
`lib/cards/bodies/*.ts` (pure SVG) are SEPARATE and **have drifted** — this session widened the gap:

**Known drift to reconcile (in-app has logic the OG body lacks):**
- **Composite:** in-app `CompositeCard` now filters NFL to the player's side (`nflSideOfBall`) and
  football GK/outfield + Penalties-Won; the OG `compositeBody` (og-bodies.ts) only drops GK slices
  by `value == null`. OG shows offense+defense+special for NFL players and GK noise for footballers.
- **Specialist:** in-app `SpecialistCard` dropped the scarcity blurb + `/100`, added the intro line,
  top-3/bottom-3 trim, football GK/outfield filter, NFL side filter; the OG `specialistBody` still
  renders `label + pct + scarcity()` only (no trim, no filters, no intro).
- **Meta card team:** in-app EntityMeta is season-aware (`sparkline.rating.team`); OG header uses
  the bundled meta team (`getOgEntityFacts`) — can show the stale last-seeded team on shares.

**Approach options:**
1. Render the SVG bodies into the DOM too (`<svg innerHTML={bodySvg(...)}>`) + CSS hover — one body,
   two mounts. Simplest convergence; loses some DOM interactivity (tooltips/hover charts).
2. A shared data→view-model layer both renderers consume (DOM components + SVG strings from the same
   normalized model). More work, keeps interactivity.
The Card Pillar spec (`~/scoracleWiki/wiki/Architecture/Card Pillar.md`) describes the intended seam.

**Interim:** if #17 stays deferred, at least port the in-app filters into the OG bodies so shares
match the app (NFL side filter + football GK/outfield + specialist cleanup + season team in OG).

---

## #23 — per-36 / per-90 normalization + position scopes

**Goal:** rate-normalized stat views (per-36 min NBA / per-90 football) + position-based scopes
(compare within a position cohort).

**Existing backend groundwork:** `sql/migrations/012_per_rate_and_scoped_percentiles.sql` already
adds per-rate + scoped percentiles — check what it exposes before building (may already serve
per-rate columns / scoped ranks). The rating engine also has `rating_scoped_ranks`
(`039_rating_scoped_ranks.sql`) and the frontend `RatingScope` type already includes `position`
(the Composite scope dropdown uses conference/division/league/position).

**Frontend surface (UX decisions):** a per-36/per-90 toggle on the stat/rating surfaces; a position
scope selector. Decide where it lives (Composite card toolbar? a global toggle?) and which stats get
rate-normalized. Likely both backend (expose per-rate values) + frontend (toggle + display).

---

## Operating notes (apply to all three)
- Branch-sync check first (CLAUDE.md step 1), both repos.
- #22 touches the LOCKED rating engine + re-rates prod → confirm scope + pre-flight + manual API
  restart. Prod DB direct reads are classifier-gated.
- Per-commit progress docs (repo + `~/scoracleWiki/Progress/` mirror).
- See memories: `rating-engine-overview`, `rating-engine-datapoint-philosophy`,
  `backend-api-restart-mechanics`, `ssr-async-mode-hydration`.
