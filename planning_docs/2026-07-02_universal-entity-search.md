# 2026-07-02 - Universal Entity Search

## Goal

Move the home page from an explicit sport-selector model to universal entity search.
Users should be able to type any supported player or team on the home page and
route directly to the correct profile. Sport mixing should remain isolated to the
home page; profile, leaderboard, compare, and downstream search controls should
stay scoped to the selected sport.

## Current Shape

The frontend already has a useful two-tier local data model:

- Lightweight sport files such as `/data/nba.json`, `/data/nfl.json`, and
  `/data/football.json` power autocomplete.
- Heavy sport meta files such as `/data/nba-meta.json`, `/data/nfl-meta.json`,
  and `/data/football-meta.json` hydrate profile identity and team details.

The search UI is not yet universal:

- `SearchBar` subscribes to `$currentSport`, so it only queries one sport at a
  time.
- Home preloads all sport autocomplete data during idle time, but the visible
  search box only searches the active sport.
- Profile/header search reuses `SearchBar`, so universal behavior must be an
  explicit home-only mode.
- `SearchControl` and `CompareSearch` already load `getEntities(sport)` and
  should remain sport-scoped.
- `CrystalBall` currently advances a sport timer and writes to `$currentSport`,
  which drives the home sport selector and leaderboard launcher.

## Proposed Model

Create one lightweight universal local search index for home:

```ts
interface UniversalSearchEntity {
  id: string;
  type: "player" | "team";
  sport: "nba" | "nfl" | "football";
  name: string;
  team?: string;
  position?: string;
  aliases?: string[];
  search_tokens?: string[];
}
```

The canonical identity remains `sport + type + id`. Never treat raw `id` as
globally unique because backend tables remain sport-separated and id collisions
are possible.

## Plan

1. Add a universal search data artifact.

   Generate `/data/entities.json` from the backend meta endpoint or a dedicated
   lightweight backend directory endpoint. Keep only text-first fields: name,
   id, sport, type, team, position, aliases, and search tokens.

2. Keep sport-specific indexes for downstream surfaces.

   Continue supporting `getEntities(sport)` for profile/header search,
   leaderboard search, compare search, co-mentions, and any sport-specific page.
   Universal search should not leak into these controls.

3. Add explicit search scope to `SearchBar`.

   Introduce a prop such as `scope="global" | "sport"`. Home uses global mode.
   Header/profile usage remains sport mode and reads the current profile sport.

4. Remove the home sport selector.

   Delete the home page sport `NavStrip`. The selected search result determines
   the routed sport:

   ```text
   /profile?sport=NBA&type=player&id=123
   ```

5. Decouple `CrystalBall` from selection state.

   Make the logo cycle passive, ideally CSS-only, so it does not need a timer
   that mutates `$currentSport`. The crystal can continue rotating through sport
   logos visually, but it should not define search scope.

6. Move profile meta hydration to the backend.

   `EntityMeta.getEntityMeta` currently reads bundled `*-meta.json` files. Once
   the backend meta endpoint is low-latency and owned, switch profile identity
   hydration to that endpoint and remove the heavy frontend meta bundles.

7. Rework leaderboard entry from home.

   Removing the home sport selector means the home `LeaderboardMenu` can no
   longer rely on `$currentSport` as an intentional user choice. Pick one of:

   - show sport choices inside the Rankings disclosure,
   - route to a default sport,
   - or open a sport-first leaderboard picker.

8. Add search boundary tests.

   Cover mixed-sport home search, sport-scoped profile/header search, duplicate
   names across sports, team aliases, player name-only matching, and correct
   profile URL generation.

## Wins

- Home becomes simpler: users type any player or team instead of selecting a
  sport first.
- The frontend ships less data after heavy meta bundles are retired.
- Backend tables stay cleanly separated while the home page gets a unified
  discovery surface.
- Profile identity becomes fresher because it comes from owned live APIs rather
  than generated static metadata.
- The search contract becomes clearer: universal only on home, scoped everywhere
  else.

## Risks

- Ambiguous names become more common. Results need visible sport, team, and
  position labels.
- A single universal JSON may grow too large as more sports are added. If that
  happens, use a tiny manifest plus lazy sport shards.
- Profile SSR becomes more dependent on backend meta endpoint latency and
  availability once local heavy meta files are removed.
- Accidentally changing shared `SearchBar` behavior globally would make profile
  search mixed-sport. The scope prop is the guardrail.
- The home leaderboard launcher currently depends on `$currentSport`; removing
  the selector requires a new explicit leaderboard sport choice.

## Open Questions

- Should `/data/entities.json` be generated from the current `/meta` endpoints,
  or should the backend expose a purpose-built `/entities` directory endpoint?
- Should global search ranking group exact-name matches across sports, or sort
  by sport/product priority first?
- Should the crystal logo respond to the highlighted search result sport, or
  remain a passive visual loop?
- What is the acceptable maximum payload size for the universal search index
  before switching to sharded loading?
