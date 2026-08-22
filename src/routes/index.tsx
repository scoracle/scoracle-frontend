/**
 * Home — the search-first landing page: wordmark + crystal ball + universal
 * search, over the AppTray. Nothing else.
 *
 * The below-the-fold sport strips and gutter ad rails were trimmed
 * 2026-08-04 (Scott): they were added for an AdSense experiment that did
 * nothing, and the staging was competing with the product. The desk stays
 * clear.
 */

import { isServer } from "solid-js/web";
import { createAsync, type RoutePreloadFuncArgs } from "@solidjs/router";
import { SPORTS } from "../lib/types";
import { getHomeMovers } from "../lib/data/leaderboard.server";
import CrystalBall from "../components/solid/CrystalBall";
import SearchBar from "../components/solid/SearchBar";
import "./index.css";

const sports = SPORTS.map((s) => ({ id: s.idLower, display: s.display }));

/** Eager warm (Scott, 2026-08-21): a hovered link home starts the movers
 *  fan-out before the click lands, so the ball is already spinning. Skipped
 *  at intent "initial" — hydration already holds the SSR payload. */
export function preload({ intent }: RoutePreloadFuncArgs) {
  if (isServer || intent === "initial") return;
  getHomeMovers(sports.map((s) => s.id)).catch(() => []);
}

export default function Home() {
  // Eager: the first mover SSRs inside the ball (index 0 is deterministic,
  // so hydration matches), the cycle takes over on mount. Any failure —
  // empty boards or the RPC itself — just leaves the ball holding its fog.
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
        {/* The landing text leads with whoever the ball is showing — the
            movers feed doubles as the hero's story prompts. */}
        <SearchBar
          scope="global"
          variant="hero"
          autoFocus
          storyNames={(movers() ?? []).map((m) => m.name)}
        />
      </div>
    </main>
  );
}
