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
import { fantasySupported } from "../../lib/cards/card-meta";
import { tierColorScore } from "../../lib/utils/tier-color";

function playerHref(sport: string, id: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=player&id=${id}`;
}
/** Magnitude score (0-100, ~50 = average), shown bare like the Composite/Specialist cards. */
const pct = (v: number): string => v.toFixed(1);

export default function RosterCard() {
  const ctx = useProfile();
  const { sport, id } = ctx;
  const data = createAsync(() => getRoster(sport(), id(), ctx.season()));
  const showFantasy = () => fantasySupported(sport());

  return (
    <Show when={data()} fallback={<EmptyCard message="No roster ratings yet." />}>
      {(d) => (
        <Show when={d().players.length > 0} fallback={<EmptyCard message="No roster ratings yet." />}>
          <Shell as="article" aria-label="Roster">
            <div class="rating-list" classList={{ "rating-list--fantasy": showFantasy() }}>
              <h3 class="rating-list-title">
                Roster · {showFantasy() ? "Rating + Fantasy" : "Composite + Specialist"}
              </h3>
              <div class="rating-list-head">
                <span />
                <span>Player</span>
                <span class="rating-h-comp">Comp</span>
                <span class="rating-h-spec">Spec</span>
                <Show when={showFantasy()}>
                  <span class="rating-h-fantasy">Fantasy</span>
                </Show>
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
                      <span class="rating-row-score rating-row-composite" style={{ color: tierColorScore(p.rating_composite_score) }}>{pct(p.rating_composite_score)}</span>
                      <span class="rating-row-score rating-row-specialist" style={{ color: tierColorScore(p.rating_sigil_score) }}>{pct(p.rating_sigil_score)}</span>
                      <Show when={showFantasy()}>
                        <span class="rating-row-score rating-row-fantasy">
                          {p.fantasy_points != null ? p.fantasy_points.toFixed(1) : "—"}
                        </span>
                      </Show>
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
