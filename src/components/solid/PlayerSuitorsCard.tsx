/**
 * PlayerSuitorsCard — the teams linked with a player ("who's after them"),
 * ranked by heat. Player-only; the player-side mirror of TransfersCard. Each row
 * links to the suitor team's profile and carries the same colored stage line +
 * full Gemma summary (via <GemmaSummary>) as the team Transfers card.
 *
 * Reads getSuitors; reuses the RatingList ranked-list style + TransfersCard.css.
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { type TransferRumor } from "../../lib/data/transfers.server";
import { getNewsRail } from "../../lib/data/news-rail.server";
import { tierColor } from "../../lib/utils/tier-color";
import { transferStageLabel, transferStageColor } from "../../lib/utils/transfer-stage";
import { transferNoun } from "../../lib/cards/card-meta";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./RatingList.css";
import "./TransfersCard.css";

function teamHref(sport: string, id: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=team&id=${id}`;
}

function SuitorRow(props: { s: TransferRumor; sport: string }) {
  const s = () => props.s;
  return (
    <li class="rating-row transfers-row">
      <span class="rating-row-rank">{s().rank}</span>
      <span class="transfers-avatar-wrap">
        <Show
          when={s().image}
          fallback={<span class="transfers-avatar transfers-avatar-mono">{s().name.charAt(0)}</span>}
        >
          {(src) => <img class="transfers-avatar transfers-avatar-team" src={src()} alt="" loading="lazy" />}
        </Show>
      </span>
      <div class="transfers-main">
        <a class="rating-row-name transfers-name" href={teamHref(props.sport, s().id)}>
          {s().name}
        </a>
        <span class="transfers-stage-line">
          <span
            class="transfers-stage-dot"
            style={{ "background-color": transferStageColor(s().stage) }}
            aria-hidden="true"
          />
          <span class="transfers-stage" style={{ color: transferStageColor(s().stage) }}>
            {transferStageLabel(s().stage)}
          </span>
        </span>
        <Show when={s().gemma_summary}>
          {(summary) => (
            <GemmaSummary text={summary()} source={s().source_attribution} class="transfers-summary" />
          )}
        </Show>
      </div>
      <span class="rating-row-score transfers-heat" style={{ color: tierColor(s().heat) }}>
        {s().heat}
      </span>
    </li>
  );
}

export default function PlayerSuitorsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  // Folded onto the news rail — for a player, the rail's transfers ARE the suitor
  // clubs (query() dedups with the News card → one fetch).
  const rail = createAsync(() => getNewsRail(sport(), type(), id()));
  const suitors = () => rail()?.transfers ?? [];
  const noun = () => transferNoun(ctx.sport());

  return (
    <Show when={rail()} fallback={<EmptyCard message="No rumors yet." />}>
      <Show when={suitors().length > 0} fallback={<EmptyCard message="No rumors yet." />}>
        <Card id="suitors" as="article" aria-label={noun()}>
          <div class="rating-list">
            <h3 class="rating-list-title">{noun()} · Heat</h3>
            <ol class="rating-list-rows">
              <For each={suitors()}>{(s) => <SuitorRow s={s} sport={sport()} />}</For>
            </ol>
          </div>
        </Card>
      </Show>
    </Show>
  );
}

export function PlayerSuitorsCardSkeleton() {
  const ctx = useProfile();
  return (
    <Shell as="article" aria-label={transferNoun(ctx.sport())}>
      <div class="rating-list">
        <Skeleton shape="line" width={140} height={12} />
        <For each={Array.from({ length: 8 })}>
          {() => <Skeleton shape="line" width={300} height={22} />}
        </For>
      </div>
    </Shell>
  );
}
