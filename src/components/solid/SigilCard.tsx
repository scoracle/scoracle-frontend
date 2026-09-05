/**
 * SigilCard — Gemma-generated 1-100 synthesis, voiced by the Oracle reading.
 *
 * Score → the Oracle's ten-card major-arcana deck (see scoracle-wiki/wiki/
 * Architecture/Vibe Score Surface.md and ./lib/cards/tarot-deck.ts); dealing
 * is deck-content's question (score present ⇒ dealt).
 *
 * Uniform card contract (Scott, 2026-08-21): the Oracle's READING is the
 * card. The archetype illustration, omen seal, subtext and credit footer all
 * retired as noise; `<Card>` still owns the vessel, the wash, the drawn name
 * box and the uniform score slot (number + card name), so the draw itself
 * still reads off the head of the card.
 *
 * Null state: handed off to the shared <EmptyCard> (the Veil variant + the
 * Veil archetype's "drawn but unread" subtext). A dealt card whose reading
 * hasn't landed holds a quiet pending line.
 */

import { Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getSigil } from "../../lib/data/sigil.server";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./SigilCard.css";

export default function SigilCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // The Sigil product — current synthesis + bounded history. Its own endpoint
  // now (the same product the meta center score reads → query() dedups).
  const data = createAsync(() => getSigil(sport(), type(), id()));
  const vibe = () => data()?.current ?? null;
  // The card's voice. SOLE access point for the voice fields — Session C folded
  // the old `oracle` payload key into `current`; this accessor was the one-line shift.
  const oracle = () => data()?.current ?? null;
  // The Oracle's card score — the current sigil synthesis. Centralized in
  // deck-scores.ts (createDeckScoreReader); query() dedups with `data` above.
  const cardScore = createDeckScoreReader(ctx, "sigil");

  return (
    <Show when={vibe()} fallback={<EmptyCard />}>
      {(_row) => (
        <Card
          id="sigil"
          as="article"
          class="sigil-card-vessel"
          aria-label="Sigil"
          score={cardScore}
        >
          <p class="card-identifier">Season synthesis, read as a sigil</p>
          {/* Uniform content template (2026-09-05): the Oracle's tweet-sized
              hook up top, the reading in short paragraphs below. */}
          <Show when={oracle()?.headline}>
            <h2 class="card-hook">{oracle()!.headline}</h2>
          </Show>
          <Show
            when={oracle()?.reading}
            fallback={<p class="card-text-pending">Oracle reading pending.</p>}
          >
            {(reading) => <GemmaSummary text={reading()} class="sigil-reading" />}
          </Show>
        </Card>
      )}
    </Show>
  );
}
