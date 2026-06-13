/**
 * TransfersCard — a team's rumor-linked players ranked by heat. Team-only.
 *
 * Label is sport-aware: "Transfers" (football) / "Trades" (NBA/NFL). Each row
 * links to the player's profile (their Specialist = "what they'd bring"). Heat
 * is the deterministic index; below the name a colored stage dot + verdict + the
 * cited source, then Gemma's grounded summary shown IN FULL via <GemmaSummary>.
 *
 * Reads getTransfers; reuses the RatingList ranked-list style.
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getTransfers, type TransferRumor } from "../../lib/data/transfers.server";
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

function playerHref(sport: string, id: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=player&id=${id}`;
}

function TransferRow(props: { t: TransferRumor; sport: string }) {
  const t = () => props.t;
  return (
    <li class="rating-row transfers-row">
      <span class="rating-row-rank">{t().rank}</span>
      <span class="transfers-avatar-wrap">
        <Show
          when={t().image}
          fallback={<span class="transfers-avatar transfers-avatar-mono">{t().name.charAt(0)}</span>}
        >
          {(src) => <img class="transfers-avatar" src={src()} alt="" loading="lazy" />}
        </Show>
      </span>
      <div class="transfers-main">
        <a class="rating-row-name transfers-name" href={playerHref(props.sport, t().id)}>
          {t().name}
          <Show when={t().direction === "outgoing"}>
            <span class="transfers-dir"> · exit</span>
          </Show>
        </a>
        <span class="transfers-stage-line">
          <span
            class="transfers-stage-dot"
            style={{ "background-color": transferStageColor(t().stage) }}
            aria-hidden="true"
          />
          <span class="transfers-stage" style={{ color: transferStageColor(t().stage) }}>
            {transferStageLabel(t().stage)}
          </span>
        </span>
        <Show when={t().gemma_summary}>
          {(summary) => (
            <GemmaSummary text={summary()} source={t().source_attribution} class="transfers-summary" />
          )}
        </Show>
      </div>
      <span class="rating-row-score transfers-heat" style={{ color: tierColor(t().heat) }}>
        {t().heat}
      </span>
    </li>
  );
}

export default function TransfersCard() {
  const ctx = useProfile();
  const { sport, id } = ctx;
  const data = createAsync(() => getTransfers(sport(), id()));
  const noun = () => transferNoun(ctx.sport());

  return (
    <Show when={data()} fallback={<EmptyCard message="No rumors yet." />}>
      {(d) => (
        <Show when={d().rumors.length > 0} fallback={<EmptyCard message="No rumors yet." />}>
          <Card id="transfers" as="article" aria-label={noun()}>
            <div class="rating-list">
              <h3 class="rating-list-title">{noun()} · Heat</h3>
              <ol class="rating-list-rows">
                <For each={d().rumors}>{(t) => <TransferRow t={t} sport={sport()} />}</For>
              </ol>
            </div>
          </Card>
        </Show>
      )}
    </Show>
  );
}

export function TransfersCardSkeleton() {
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
