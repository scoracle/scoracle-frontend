/**
 * TransfersCard — the entity's rumor heat, for ANY entity type. For a team these
 * are the incoming/outgoing players; for a player, the interested clubs. One card,
 * one direction-agnostic concept ("Transfers" / "Trades" for NBA/NFL) — the old
 * team-only "Transfers" + player-only "Suitors" split is gone.
 *
 * Each row links to the counterparty's profile and carries the heat index, a
 * colored stage line + cited source, then Gemma's grounded summary via
 * <GemmaSummary>. Reads the transfers product (getTransfers).
 */

import { For, Show, createSignal, onMount } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getTransfers, type TransferRumor } from "../../lib/data/transfers.server";
import { tierColor } from "../../lib/utils/tier-color";
import { transferStageLabel, transferStageColor } from "../../lib/utils/transfer-stage";
import { formatDate, formatRelativeTime } from "../../lib/utils/date";
import { transferNoun } from "../../lib/cards/card-meta";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import LoadingCard from "./LoadingCard";
import "./content-cards.css";
import "./RatingList.css";
import "./TransfersCard.css";

function counterpartyHref(sport: string, type: "player" | "team", id: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=${type}&id=${id}`;
}

const TRANSFER_TRAJECTORY_LABELS: Record<string, string> = {
  developing_story: "Developing story",
  heating_up: "Heating up",
  cooling_off: "Cooling off",
};

function trajectoryLabel(t: TransferRumor): string | null {
  if (t.trajectory_label) return t.trajectory_label;
  return t.trajectory ? TRANSFER_TRAJECTORY_LABELS[t.trajectory] ?? null : null;
}

function freshnessTime(t: TransferRumor, mounted: boolean): string | null {
  const at = t.source_latest_at ?? t.updated_at ?? null;
  if (!at) return null;
  return mounted ? formatRelativeTime(at) : formatDate(at);
}

function sourceLabel(t: TransferRumor): string | null {
  const count = t.source_count ?? 0;
  const names = t.source_names ?? [];
  if (count <= 0 && names.length === 0) return null;
  const countLabel = count > 0 ? `${count} ${count === 1 ? "source" : "sources"}` : null;
  const shownNames = names.slice(0, 2).join(", ");
  return [countLabel, shownNames].filter(Boolean).join(" · ");
}

export function TransferRow(props: { t: TransferRumor; sport: string; counterpartyType: "player" | "team"; mounted?: boolean }) {
  const t = () => props.t;
  const isTeam = () => props.counterpartyType === "team";
  const summary = () => t().summary ?? t().gemma_summary ?? null;
  const trajectory = () => trajectoryLabel(t());
  const fresh = () => freshnessTime(t(), props.mounted ?? false);
  const sources = () => sourceLabel(t());
  return (
    <li class="rating-row transfers-row">
      <span class="rating-row-rank">{t().rank}</span>
      <span class="transfers-avatar-wrap">
        <Show
          when={t().image}
          fallback={<span class="transfers-avatar transfers-avatar-mono">{t().name.charAt(0)}</span>}
        >
          {(src) => (
            <img
              class="transfers-avatar"
              classList={{ "transfers-avatar-team": isTeam() }}
              src={src()}
              alt=""
              loading="lazy"
            />
          )}
        </Show>
      </span>
      <div class="transfers-main">
        <a class="rating-row-name transfers-name" href={counterpartyHref(props.sport, props.counterpartyType, t().id)}>
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
        <Show when={trajectory() || fresh() || sources()}>
          <span class="transfers-news-meta">
            <Show when={trajectory()}>
              {(label) => (
                <span class="transfers-trajectory" data-trajectory={t().trajectory ?? undefined}>
                  {label()}
                </span>
              )}
            </Show>
            <Show when={fresh()}>
              {(when) => <span>Updated {when()}</span>}
            </Show>
            <Show when={sources()}>
              {(s) => <span>{s()}</span>}
            </Show>
          </span>
        </Show>
        <Show when={summary()}>
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
  const { sport, type, id } = ctx;
  // The transfers product — vetted rumor heat list (pre-narrative data). The
  // counterparty is the OTHER entity type: a team's rows are players; a player's
  // rows are clubs.
  const data = createAsync(() => getTransfers(sport(), type(), id()));
  const rumors = () => data()?.transfers ?? [];
  const counterpartyType = (): "player" | "team" => (type() === "team" ? "player" : "team");
  const noun = () => transferNoun(sport());
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  return (
    <Show when={data()} fallback={<EmptyCard message="No rumors yet." />}>
      <Show when={rumors().length > 0} fallback={<EmptyCard message="No rumors yet." />}>
        <Card id="transfers" as="article" aria-label={noun()}>
          <div class="rating-list">
            <h3 class="card-eyebrow rating-list-title">{noun()} · Heat</h3>
            <ol class="rating-list-rows">
              <For each={rumors()}>
                {(t) => <TransferRow t={t} sport={sport()} counterpartyType={counterpartyType()} mounted={mounted()} />}
              </For>
            </ol>
          </div>
        </Card>
      </Show>
    </Show>
  );
}

export function TransfersCardSkeleton() {
  const ctx = useProfile();
  return <LoadingCard label={transferNoun(ctx.sport())} />;
}
