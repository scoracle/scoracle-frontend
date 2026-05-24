# 2026-05-23 — TrendsCard: per-game season Record section for teams

## Goal

Add a third section to the TrendsCard (after Vibes and Stats) that, for
team entities only, shows the team's W–L–D record for the current season
and lists every finalized game with team_score / opponent_score color-
coded by outcome (green=win, red=loss, gray=draw). Gives a glanceable
season-shape readout alongside the existing recent-form signals.

## What Was Done

`src/lib/utils/data-sources.ts`:

- New `teamResultsUrl(sport, id, season?)` builder for
  `GET /api/v1/{sport}/team/{id}/results?season=…`.

`src/lib/data/team-results.server.ts` (new):

- `getTeamResults(sport, id, season?)` server-fn wrapped in `query()`
  for per-key cache + dedup. Returns the full response envelope
  (`{ page, sport, team_id, results[], meta }`) typed against
  ENDPOINTS.md §Results. Each game carries `fixture_id`, `start_time`,
  `status` (`completed` | `seeded`), `round`, `home_away`, `team_score`,
  `opponent_score`, the backend-derived `result` (`W`/`L`/`D`/null), and
  a nested `opponent` object (`id`, `name`, `short_code`, `logo_url`).
- 404 → null so the card falls through to its empty state.

`src/components/solid/TrendsCard.tsx`:

- New `results` resource via `createAsync`, gated on `type === "team"`
  (players resolve to `null`).
- `summarizeRecord()` walks the response, skipping rows where `result`
  is null, tallying W/L/D and surfacing the resolved `meta.season`.
  Backend already orders newest first — kept, matching the rest of the
  Card's recency framing.
- `recordSummary` memo + `showRecord` flag fold the new section into
  the existing `isEmpty` check, and the divider only renders between
  sections that are actually shown.
- Record section header: `Record · {season} · {W}–{L}[–{D}]`. Per-game
  row: `[W/L/D] [Apr 12] [131–107] [vs|@ UTA]` — the opponent's
  `short_code` rides along when present, and the section header keeps
  the year so each row only needs month + day. Date uses
  `Intl.DateTimeFormat` with `timeZone: "UTC"` so SSR and client output
  match.
- `MAX_RECORD_ROWS = 5` caps the displayed list. While at it, also
  added `MAX_VIBE_ROWS = 5` — the Vibes section was rendering the full
  7-day backend window, which could push 7+ rows on active days. All
  three sections now share the same 5-row recency budget (Vibes: last
  5 from the 7-day window; Stats: top 5 movers from the last 3 games;
  Record: last 5 games while the header carries the full-season tally).

`src/components/solid/TrendsCard.css`:

- New `.trends-record-rows`, `.trends-record-row`,
  `.trends-record-outcome`, `.trends-record-score`, `.trends-record-sep`,
  `.trends-record-locus` styles. Outcome color is driven off
  `data-outcome` on the row (`W` → `--percentile-elite` green, `L` →
  `--percentile-poor` red, `D` → `--text-tertiary` gray), so the whole
  row inherits the W/L/D tint without per-element inline styles.

## Files Changed

- `src/lib/utils/data-sources.ts`
- `src/lib/data/team-results.server.ts` (new)
- `src/components/solid/TrendsCard.tsx`
- `src/components/solid/TrendsCard.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 137/137
- Live endpoint smoke-test: `GET https://api.scoracle.com/api/v1/nba/team/14/results`
  → 200 with the expected envelope (Lakers, 82 games, 2025 season).
  Response shape lines up with `TeamResultsResponse` byte-for-byte.

UI not opened in the browser this commit.

## Result

Team profiles get a chronological scoreline column inside Trends — at a
glance you see W/L/D streaks (color), magnitude (score), date, and
venue (vs/@ short_code). Player profiles are unchanged. The display
caps keep the Card a recency surface — full-season W/L/D lives in the
header for context, but the body stays five rows tall regardless of
sport (NBA's 82, NFL's 17, football's ~38 all render the same way).
