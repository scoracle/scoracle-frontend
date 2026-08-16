/**
 * TransferRow — one rumor row on the News card's Transfers/Trades facet. For a
 * team the counterparty is a player; for a player, a club. Links to the
 * counterparty's profile and carries a colored stage line + cited source, then
 * Gemma's grounded summary via <GemmaSummary>. Rows arrive heat-ranked but show
 * no per-rumor heat numeral — the card-level score is the surface's only number.
 */

import { Show } from "solid-js";

import type { TransferRumor } from "../../lib/data/transfers.server";
import { transferStageLabel, transferStageColor } from "../../lib/utils/transfer-stage";
import { formatDate, formatRelativeTime } from "../../lib/utils/date";
import { newsTrajectoryLabel, sourceAttribution } from "../../lib/utils/news-display";
import { profilePath } from "../../lib/utils/profile-url";
import GemmaSummary from "./GemmaSummary";
import "./content-cards.css";
import "./RatingList.css";
import "./TransfersCard.css";

function counterpartyHref(
  sport: string,
  type: "player" | "team",
  id: number,
  name: string,
): string {
  return profilePath(sport, type, id, { name });
}

function trajectoryLabel(t: TransferRumor): string | null {
  return newsTrajectoryLabel(t.trajectory, t.trajectory_label);
}

function freshnessTime(t: TransferRumor, mounted: boolean): string | null {
  const at = t.source_latest_at ?? t.updated_at ?? null;
  if (!at) return null;
  return mounted ? formatRelativeTime(at) : formatDate(at);
}

function sourceLabel(t: TransferRumor): string | null {
  return sourceAttribution(t.source_count, t.source_names);
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
        <a class="rating-row-name transfers-name" href={counterpartyHref(props.sport, props.counterpartyType, t().id, t().name)}>
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
    </li>
  );
}
