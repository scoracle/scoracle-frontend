/**
 * /profile — the profile directory landing.
 *
 * Before 2026-07-18 the bare path rendered an empty deck (EntityMeta bails
 * without an entity), and it sat in the sitemap at priority 0.9 — a blank
 * page as the site's second-most-important URL. Now it's a real browse
 * surface: universal search plus each sport's top players and teams, every
 * row deep-linking to a path-based profile. Server-rendered like the home
 * strips (bounded row counts — never the full 15k-entity directory, which
 * would serialize into the HTML).
 *
 * Legacy deep links (`/profile?sport=…&type=…&id=…`) are 301-redirected to
 * the path form by the server middleware; the <Navigate> below is the
 * client-side belt-and-braces for any in-app navigation that still carries
 * the old shape.
 */

import { For, Show, ErrorBoundary } from "solid-js";
import { Title, Meta } from "@solidjs/meta";
import { createAsync, Navigate, useSearchParams } from "@solidjs/router";
import { SPORTS } from "../../lib/types";
import { getLeaderboard } from "../../lib/data/leaderboard.server";
import { tierColorScore } from "../../lib/utils/tier-color";
import { profilePath } from "../../lib/utils/profile-url";
import { paramValue } from "../../lib/utils/search-params";
import SearchBar from "../../components/solid/SearchBar";
import { CardVessel } from "../../components/solid/Card";
import "./directory.css";

const PLAYER_LIMIT = 10;
const TEAM_LIMIT = 6;

/** One sport's browse block: top players + top teams off the rating board —
 *  the same query() reads the home strips and /leaderboard warm. */
function SportDirectory(props: { sport: string; display: string }) {
  const players = createAsync(() =>
    getLeaderboard(props.sport, "player", "composite", null, PLAYER_LIMIT),
  );
  const teams = createAsync(() =>
    getLeaderboard(props.sport, "team", "composite", null, TEAM_LIMIT),
  );

  const playerRows = () => players()?.leaders ?? [];
  const teamRows = () => teams()?.leaders ?? [];

  return (
    <Show when={playerRows().length > 0 || teamRows().length > 0}>
      <CardVessel as="section" class="profile-dir-strip" aria-label={`${props.display} profiles`}>
        <header class="profile-dir-head">
          <h2 class="profile-dir-title">{props.display}</h2>
          <a
            class="profile-dir-more"
            href={`/leaderboard?sport=${props.sport.toUpperCase()}`}
          >
            Full leaderboard
          </a>
        </header>
        <div class="profile-dir-columns">
          <Show when={playerRows().length > 0}>
            <div class="profile-dir-col">
              <h3 class="profile-dir-subtitle">Top players</h3>
              <ol class="profile-dir-rows">
                <For each={playerRows()}>
                  {(row) => (
                    <li class="profile-dir-row">
                      <a
                        class="profile-dir-name"
                        href={profilePath(props.sport, row.entity_type, row.id, { name: row.name })}
                      >
                        {row.name}
                      </a>
                      <span class="profile-dir-team">{row.team_code}</span>
                      <Show when={row.rating_score != null}>
                        <span
                          class="profile-dir-score"
                          style={{ color: tierColorScore(row.rating_score!) }}
                        >
                          {row.rating_score!.toFixed(1)}
                        </span>
                      </Show>
                    </li>
                  )}
                </For>
              </ol>
            </div>
          </Show>
          <Show when={teamRows().length > 0}>
            <div class="profile-dir-col">
              <h3 class="profile-dir-subtitle">Top teams</h3>
              <ol class="profile-dir-rows">
                <For each={teamRows()}>
                  {(row) => (
                    <li class="profile-dir-row">
                      <a
                        class="profile-dir-name"
                        href={profilePath(props.sport, row.entity_type, row.id, { name: row.name })}
                      >
                        {row.name}
                      </a>
                    </li>
                  )}
                </For>
              </ol>
            </div>
          </Show>
        </div>
      </CardVessel>
    </Show>
  );
}

export default function ProfileDirectory() {
  const [searchParams] = useSearchParams();

  // Legacy query-param deep link — forward to the path-based URL, carrying
  // the secondary state (tab, season, …) along untouched.
  const legacyTarget = () => {
    const sport = paramValue(searchParams.sport);
    const id = paramValue(searchParams.id);
    if (!sport || !id) return null;
    const type = paramValue(searchParams.type) === "team" ? "team" : "player";
    const rest = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "sport" || key === "type" || key === "id") continue;
      const v = paramValue(value);
      if (v != null) rest.set(key, v);
    }
    const path = profilePath(sport, type, id);
    const qs = rest.toString();
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <Show when={!legacyTarget()} fallback={<Navigate href={legacyTarget()!} />}>
      <Title>Browse profiles - Scoracle</Title>
      <Meta
        name="description"
        content="Browse every NBA, NFL, and football player and team on Scoracle — original ratings, vibe sentiment, momentum, stats, and curated news on each profile."
      />
      <main class="profile-dir-main">
        <header class="profile-dir-headline">
          <h1>Browse profiles</h1>
          <p>
            Every player and team on Scoracle has a profile: our composite
            rating, a vibe read off current coverage, momentum trends, the
            underlying stats, and a curated news feed. Start from a search, or
            from each sport's current leaders below.
          </p>
        </header>
        <div class="profile-dir-search">
          <SearchBar scope="global" variant="hero" />
        </div>
        <div class="profile-dir-boards">
          <For each={SPORTS}>
            {(s) => (
              <ErrorBoundary fallback={null}>
                <SportDirectory sport={s.idLower} display={s.display} />
              </ErrorBoundary>
            )}
          </For>
        </div>
      </main>
    </Show>
  );
}
