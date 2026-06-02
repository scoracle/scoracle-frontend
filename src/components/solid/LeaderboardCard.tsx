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
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./RatingList.css";

function profileHref(sport: string, type: string, id: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=${type}&id=${id}`;
}
const z = (v: number): string => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;

export default function LeaderboardCard() {
  const ctx = useProfile();
  const { sport, type } = ctx;
  const data = createAsync(() => getLeaderboard(sport, type, undefined, ctx.season(), 25));

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
                      <span class="rating-row-score rating-row-composite">{z(p.rating_composite)}</span>
                      <span class="rating-row-score rating-row-specialist">{z(p.rating_specialist)}</span>
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
