/**
 * RosterCard — every player on a team's season roster, ranked by the sum of
 * their Composite + Specialist rating. Team entities only (the profile id IS
 * the team id). Each player name links to that player's profile.
 *
 * Reads getRoster. A base surface — column sorting and a Composite/Specialist
 * scope toggle are follow-ons.
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getRoster } from "../../lib/data/roster.server";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./RatingList.css";

function playerHref(sport: string, id: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=player&id=${id}`;
}
const z = (v: number): string => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;

export default function RosterCard() {
  const ctx = useProfile();
  const { sport, id } = ctx;
  const data = createAsync(() => getRoster(sport(), id(), ctx.season()));

  return (
    <Show when={data()} fallback={<EmptyCard message="No roster ratings yet." />}>
      {(d) => (
        <Show when={d().players.length > 0} fallback={<EmptyCard message="No roster ratings yet." />}>
          <Shell as="article" aria-label="Roster">
            <div class="rating-list">
              <h3 class="rating-list-title">Roster · Composite + Specialist</h3>
              <div class="rating-list-head">
                <span />
                <span>Player</span>
                <span class="rating-h-comp">Comp</span>
                <span class="rating-h-spec">Spec</span>
              </div>
              <ol class="rating-list-rows">
                <For each={d().players}>
                  {(p) => (
                    <li class="rating-row">
                      <span class="rating-row-rank">{p.rank}</span>
                      <a class="rating-row-name" href={playerHref(sport(), p.id)}>
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

export function RosterCardSkeleton() {
  return (
    <Shell as="article" aria-label="Roster">
      <div class="rating-list">
        <Skeleton shape="line" width={180} height={12} />
        <For each={Array.from({ length: 8 })}>
          {() => <Skeleton shape="line" width={300} height={18} />}
        </For>
      </div>
    </Shell>
  );
}
