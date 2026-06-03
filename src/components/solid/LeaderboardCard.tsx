/**
 * LeaderboardCard — the sport's positionless rating board, scoped to the
 * profile's entity type (player profile → top players, team profile → top
 * teams). Composite-scope, top 25. Each row links to that entity's profile.
 *
 * Reads getLeaderboard (one payload carries Composite + Specialist per row).
 * A base surface — the scope toggle (composite / specialist / specialty) and
 * the full board are follow-ons.
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getLeaderboard } from "../../lib/data/leaderboard.server";
import { getStarline } from "../../lib/data/starline.server";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./RatingList.css";

function profileHref(sport: string, type: string, id: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=${type}&id=${id}`;
}
/** 0-100 percentile grade, 1 decimal so the elite tail is distinct (only #1 = 100.0). */
const grade = (v: number): string => v.toFixed(1);

export default function LeaderboardCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  // Leaders re-rank within the selected cohort (scope): filter the board to the
  // profile entity's cohort. The cohort VALUE comes from the starline rating
  // (warm — shared query cache). "all" = the sport-wide board.
  const starline = createAsync(() => getStarline(sport, type, id, ctx.season()));
  const cohort = (): { position?: string | null; leagueId?: number | null; conference?: string | null; division?: string | null } => {
    const s = ctx.scope();
    const r = starline()?.rating;
    if (!r || s === "all") return {};
    if (s === "position") return { position: r.position };
    if (s === "conference") return { conference: r.conference };
    if (s === "division") return { division: r.division };
    if (s === "league") return { leagueId: r.league_id };
    return {};
  };
  const data = createAsync(() => {
    const c = cohort();
    return getLeaderboard(
      sport, type, undefined, ctx.season(), 25,
      c.position ?? null, c.leagueId ?? null, c.conference ?? null, c.division ?? null,
    );
  });

  return (
    <Show when={data()} fallback={<EmptyCard message="No leaderboard yet." />}>
      {(d) => (
        <Show when={d().leaders.length > 0} fallback={<EmptyCard message="No leaderboard yet." />}>
          <Shell as="article" aria-label="Leaderboard">
            <div class="rating-list">
              <h3 class="rating-list-title">{d().sport.toUpperCase()} Leaders · Composite</h3>
              <div class="rating-list-head">
                <span />
                <span>{d().entity_type === "team" ? "Team" : "Player"}</span>
                <span class="rating-h-comp">Comp</span>
                <span class="rating-h-spec">Spec</span>
              </div>
              <ol class="rating-list-rows">
                <For each={d().leaders}>
                  {(p) => (
                    <li class="rating-row">
                      <span class="rating-row-rank">{p.rank}</span>
                      <a class="rating-row-name" href={profileHref(sport, p.entity_type, p.id)}>
                        {p.name}
                        <Show when={p.position}>
                          <span class="rating-row-pos"> · {p.position}</span>
                        </Show>
                      </a>
                      <span class="rating-row-score rating-row-composite">{grade(p.rating_composite_rank)}</span>
                      <span class="rating-row-score rating-row-specialist">{grade(p.rating_specialist_rank)}</span>
                    </li>
                  )}
                </For>
              </ol>
            </div>
          </Shell>
        </Show>
      )}
    </Show>
  );
}

export function LeaderboardCardSkeleton() {
  return (
    <Shell as="article" aria-label="Leaderboard">
      <div class="rating-list">
        <Skeleton shape="line" width={180} height={12} />
        <For each={Array.from({ length: 8 })}>
          {() => <Skeleton shape="line" width={300} height={18} />}
        </For>
      </div>
    </Shell>
  );
}
