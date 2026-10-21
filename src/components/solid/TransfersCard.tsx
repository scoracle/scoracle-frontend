import { useProfileReads, useProfileRead } from "../../lib/data/profile-data";
/** The Insider's latest reading and heat-ranked transfer rumors. */
import { For, Show, createMemo } from "solid-js";
import { useProfile } from "../../contexts/profile";
import { transferNoun } from "../../lib/cards/card-meta";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import { TransferRow } from "./TransferRow";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import GemmaSummary from "./GemmaSummary";
import "./content-cards.css";
import "./TransfersCard.css";
// Portrait-card fit cap (the card token never scrolls or crops): compact
// rumor rows fill the silhouette at ~5. The scope's full board lives on
// /leaderboard — the card is the distilled read, not the archive.
const MAX_RUMORS = 5;
export default function TransfersCard() {
    const ctx = useProfile();
    const { sport, type } = ctx;
    const transfers = useProfileRead("transfers");
    // Memoized: this copies, sorts and slices on every read, and it is read more
    // than once per render (count line, list head, <For>). createMemo also keeps
    // the item IDENTITIES stable, so the <For> below diffs on re-read instead of
    // keying on a fresh array each time.
    const rumors = createMemo(() => [...(transfers()?.transfers ?? [])]
        .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))
        .slice(0, MAX_RUMORS));
    // The Insider's card score — his latest wire wrap. Centralized in
    // deck-scores.ts (createDeckScoreReader), read by the meta-card ring too.
    const cardScore = createDeckScoreReader(ctx, useProfileReads(), "transfers");
    // For a team the counterparty is a player; for a player, a club.
    const counterpartyType = (): "player" | "team" => (type() === "team" ? "player" : "team");
    const scopeIdentifier = () => `Latest ${transferNoun(sport())}, heat ranked`;
    return (<Show when={transfers()?.headline || transfers()?.wire_read || rumors().length > 0} fallback={<EmptyCard message="No rumors yet."/>}>
      <Card id="transfers" as="article" aria-label={transferNoun(sport())} class="transfers-card" score={cardScore}>
        <p class="card-identifier">{scopeIdentifier()}</p>

        <Show when={transfers()?.headline}>
          <h2 class="card-hook">{transfers()!.headline}</h2>
        </Show>
        <Show when={transfers()?.wire_read}>
          {(body) => <GemmaSummary text={body()} />}
        </Show>

        <div class="transfers-list">
          <ol class="transfers-rows">
            <For each={rumors()}>
              {(t) => (<TransferRow t={t} sport={sport()} counterpartyType={counterpartyType()}/>)}
            </For>
          </ol>
        </div>
      </Card>
    </Show>);
}
