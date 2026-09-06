/**
 * TransferRow — one rumor row on the Insider's card. For a team the
 * counterparty is a player; for a player, a club. Links to the counterparty's
 * profile, keeps the entity's mark (headshot/crest — Scott, 2026-08-21: the
 * one image the deck still carries), then Gemma's grounded summary via
 * <GemmaSummary> (source rides inline). Rows arrive heat-ranked but show no
 * per-rumor metadata — the card-level score is the surface's only number.
 */

import { Show } from "solid-js";

import type { TransferRumor } from "../../lib/data/transfers.server";
import { profilePath } from "../../lib/utils/profile-url";
import GemmaSummary from "./GemmaSummary";
import "./content-cards.css";
import "./TransfersCard.css";

function counterpartyHref(
  sport: string,
  type: "player" | "team",
  id: number,
  name: string,
): string {
  return profilePath(sport, type, id, { name });
}

export function TransferRow(props: { t: TransferRumor; sport: string; counterpartyType: "player" | "team" }) {
  const t = () => props.t;
  const isTeam = () => props.counterpartyType === "team";
  const summary = () => t().headline ?? null;
  return (
    <li class="transfers-row">
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
        <a class="transfers-name" href={counterpartyHref(props.sport, props.counterpartyType, t().id, t().name)}>
          {t().name}
        </a>
        <Show when={summary()}>
          {(summary) => (
            <GemmaSummary text={summary()} source={t().source_attribution} class="transfers-summary" />
          )}
        </Show>
      </div>
    </li>
  );
}
