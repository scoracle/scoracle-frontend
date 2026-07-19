/**
 * Home — the search-first landing page, with real content below the fold.
 *
 * Hero: wordmark + crystal ball + universal search. Below it, one strip per
 * sport (top-rated players + the leading narrative) rendered through the same
 * server query() calls the leaderboard uses, so the landing page ships
 * substantive HTML on first byte — for readers and crawlers alike — and every
 * row deep-links into a profile.
 */

import { For, Show, ErrorBoundary } from "solid-js";
import { createAsync } from "@solidjs/router";
import { SPORTS } from "../lib/types";
import {
  getLeaderboard,
  getHomeMovers,
  getNewsLeaderboard,
} from "../lib/data/leaderboard.server";
import { tierColorScore } from "../lib/utils/tier-color";
import { profilePath } from "../lib/utils/profile-url";
import CrystalBall from "../components/solid/CrystalBall";
import SearchBar from "../components/solid/SearchBar";
import Shell from "../components/solid/Shell";
import GutterAds from "../components/solid/GutterAds";
import "./index.css";

const sports = SPORTS.map((s) => ({ id: s.idLower, display: s.display }));

const STRIP_LIMIT = 5;

function profileHref(sport: string, type: string, id: number, name: string): string {
  return profilePath(sport, type, id, { name });
}

/**
 * One sport's slice of "today": the top of the rating board and the hottest
 * narrative. Reuses the leaderboard queries, so a later visit to /leaderboard
 * lands on a warm cache (and vice versa).
 */
function SportStrip(props: { sport: string; display: string }) {
  const board = createAsync(() =>
    getLeaderboard(props.sport, "player", "composite", null, STRIP_LIMIT),
  );
  const news = createAsync(() => getNewsLeaderboard(props.sport, undefined, 1, "current_week"));

  const leaders = () => board()?.leaders ?? [];
  const topStory = () => news()?.leaders?.[0] ?? null;

  return (
    <Show when={leaders().length > 0}>
      <Shell as="section" class="home-strip" aria-label={`${props.display} highlights`}>
        <header class="home-strip-head">
          <h2 class="home-strip-title">{props.display}</h2>
          <a class="home-strip-more" href={`/leaderboard?sport=${props.sport.toUpperCase()}`}>
            Full leaderboard
          </a>
        </header>
        <ol class="home-strip-rows">
          <For each={leaders()}>
            {(row) => (
              <li class="home-strip-row">
                <span class="home-strip-rank">{row.rank ?? "—"}</span>
                <a class="home-strip-name" href={profileHref(props.sport, row.entity_type, row.id, row.name)}>
                  {row.name}
                </a>
                <span class="home-strip-team">{row.team_code}</span>
                <Show when={row.rating_composite_score != null}>
                  <span
                    class="home-strip-score"
                    style={{ color: tierColorScore(row.rating_composite_score!) }}
                  >
                    {row.rating_composite_score!.toFixed(1)}
                  </span>
                </Show>
              </li>
            )}
          </For>
        </ol>
        <Show when={topStory()}>
          {(story) => (
            <a
              class="home-strip-story"
              href={`/leaderboard?sport=${props.sport.toUpperCase()}&board=news`}
            >
              <span class="home-strip-story-eyebrow">Leading story</span>
              <span class="home-strip-story-title">
                {story().name} — {story().narrative_title}
              </span>
              <Show when={story().body}>
                <span class="home-strip-story-body">{story().body}</span>
              </Show>
            </a>
          )}
        </Show>
      </Shell>
    </Show>
  );
}

export default function Home() {
  // Eager like every other home board: the first mover SSRs inside the ball
  // (index 0 is deterministic, so hydration matches), the cycle takes over on
  // mount. Any failure — empty boards or the RPC itself — just leaves the
  // ball holding its fog.
  const movers = createAsync(() => getHomeMovers(sports.map((s) => s.id)).catch(() => []));

  return (
    <main class="home-main">
      <header class="home-headline">
        <h1 class="home-headline-title">SCORACLE</h1>
      </header>
      <div class="central-card">
        <CrystalBall
          mainLogoPath="/images/scoracle_crystal_ball.png"
          movers={movers() ?? []}
        />
      </div>
      <div class="home-search">
        <SearchBar scope="global" variant="hero" autoFocus />
      </div>

      {/* A failed strip degrades to nothing — the hero and the other sports
          still render; nothing here may take the route down. */}
      <div class="home-boards">
        <For each={sports}>
          {(s) => (
            <ErrorBoundary fallback={null}>
              <SportStrip sport={s.id} display={s.display} />
            </ErrorBoundary>
          )}
        </For>
      </div>

      <GutterAds />
    </main>
  );
}
