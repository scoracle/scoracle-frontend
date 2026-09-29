import { Loading, createMemo } from "solid-js";
/**
 * Home — the search-first landing page: wordmark + crystal ball + universal
 * search, over the AppTray. Nothing else.
 *
 * The below-the-fold sport strips and gutter ad rails were trimmed
 * 2026-08-04 (Scott): they were added for an AdSense experiment that did
 * nothing, and the staging was competing with the product. The desk stays
 * clear.
 */
import { isServer } from "@solidjs/web";
import { type RoutePreloadFuncArgs } from "@solidjs/router";
import { SPORTS } from "../lib/types";
import { getHomeMovers } from "../lib/data/leaderboard.server";
import CrystalBall from "../components/solid/CrystalBall";
import SearchBar from "../components/solid/SearchBar";
import "./index.css";
import PageAtmosphere from "../components/solid/PageAtmosphere";
const sports = SPORTS.map((s) => ({ id: s.idLower, display: s.display }));
/** Eager warm (Scott, 2026-08-21): a hovered link home starts the movers
 *  fan-out before the click lands, so the ball is already spinning. Skipped
 *  at intent "initial" — hydration already holds the SSR payload. */
export function preload({ intent }: RoutePreloadFuncArgs) {
    if (isServer || intent === "initial")
        return;
    getHomeMovers(sports.map((s) => s.id)).catch(() => []);
}
export default function Home() {
    // Eager: the first mover SSRs inside the ball (index 0 is deterministic,
    // so hydration matches), the cycle takes over on mount. Any failure —
    // empty boards or the RPC itself — just leaves the ball holding its fog.
    //
    // NOTE: .catch() covers a FAILED read but not a PENDING one, so this memo
    // still suspends while /movers is in flight. The read happens in the JSX
    // below, and without a local boundary it escalated to app.tsx's
    // <Loading on={pathname}> — replacing the wordmark, the ball AND the search
    // with the whole-page PageSkeleton over a decorative carousel.
    // loadingValue: [] is NOT the fix here: it would also swallow the SSR pass,
    // and verify:ssr contractually requires the first mover in the initial HTML.
    const movers = createMemo(() => getHomeMovers(sports.map((s) => s.id)).catch(() => []));
    return (<main class="home-main">
      <PageAtmosphere />
      {/* Paints immediately — the wordmark never waits on the carousel. */}
      <header class="home-headline">
        <h1 class="home-headline-title">SCORACLE</h1>
      </header>
      {/* Own boundary: the hero region waits on movers, the page shell does not.
          The fallback copies the ball's box (.crystal-art is 1378/1309, capped
          at 560px) so the search below it does not shift when the art lands. */}
      <Loading fallback={<>
        <div class="central-card">
          <div class="crystal-art-placeholder" role="status" aria-label="Loading movers"/>
        </div>
        <div class="home-search"/>
      </>}>
        <div class="central-card">
          <CrystalBall mainLogoPath="/images/scoracle_crystal_ball.webp" movers={movers() ?? []}/>
        </div>
        <div class="home-search">
          {/* The landing text leads with whoever the ball is showing — the
              movers feed doubles as the hero's story prompts. */}
          <SearchBar scope="global" variant="hero" autoFocus storyNames={(movers() ?? []).map((m) => m.name)}/>
        </div>
      </Loading>
    </main>);
}
