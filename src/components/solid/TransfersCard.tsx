/**
 * TransfersCard — The Insider's card (Characters Phase 1, 2026-07-22):
 * transfer/trade rumors and their likelihood, heat ranked. Extracted from the
 * old News hub's facet into a standalone peer card. Keeps the shared
 * historical `newsScope` (Transfers remain the transfer-restricted rumor
 * facet of the broader narrative system, on their own surface).
 *
 * Reads getTransfers. Row chrome lives in <TransferRow> (shared shape).
 */

import { For, Show, createSignal, onMount } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getTransfers } from "../../lib/data/transfers.server";
import { transferNoun } from "../../lib/cards/card-meta";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import { TransferRow } from "./TransferRow";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./RatingList.css";
import "./TransfersCard.css";

// Portrait-card fit cap (the card token never scrolls or crops): compact
// rumor rows fill the silhouette at ~5. The scope's full board lives on
// /leaderboard — the card is the distilled read, not the archive.
const MAX_RUMORS = 5;

export default function TransfersCard() {
  const ctx = useProfile();
  const { sport, type, id, newsScope } = ctx;

  const transfers = createAsync(() => getTransfers(sport(), type(), id(), newsScope()));

  const rumors = () =>
    [...(transfers()?.transfers ?? [])]
      .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))
      .slice(0, MAX_RUMORS);

  // The Insider's card score — his latest wire wrap. Centralized in
  // deck-scores.ts (createDeckScoreReader), read by the meta-card ring too.
  const cardScore = createDeckScoreReader(ctx, "transfers");
  // For a team the counterparty is a player; for a player, a club.
  const counterpartyType = (): "player" | "team" => (type() === "team" ? "player" : "team");

  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  const scopeIdentifier = () =>
    `${transfers()?.scope?.label ?? "Current week"} ${transferNoun(sport())}, heat ranked`;

  // An empty scope is a whole-card empty — always the Veil, never a lone
  // line of copy inside an otherwise blank card (Scott, 2026-07-11).
  const emptyMessage = () =>
    transfers() ? "No rumors in this scope." : "No rumors yet.";

  return (
    <Show
      when={transfers() && rumors().length > 0}
      fallback={<EmptyCard message={emptyMessage()} />}
    >
      <Card
        id="transfers"
        as="article"
        aria-label={transferNoun(sport())}
        class="transfers-card"
        score={cardScore}
      >
        <p class="card-identifier">{scopeIdentifier()}</p>

        <div class="rating-list">
          <ol class="rating-list-rows">
            <For each={rumors()}>
              {(t) => (
                <TransferRow
                  t={t}
                  sport={sport()}
                  counterpartyType={counterpartyType()}
                  mounted={mounted()}
                />
              )}
            </For>
          </ol>
        </div>
      </Card>
    </Show>
  );
}
