/**
 * ScoutingCard — The Scout's REPORT (the Scouting/Profile split, Scott
 * 2026-09-05): "the scouting card should stay just prose… This will be the
 * scouting report for the entity." The chart, the compare butterfly, and
 * every per-x condition moved to ProfileCard — the chart is not a scope of
 * the report, and this card declares no controls at all: the rail's year +
 * week axis is its only time frame.
 *
 * Uniform content template (2026-09-05): the Scout's tweet-sized headline at
 * the top, then his report in short paragraphs (GemmaSummary splits 2-3
 * sentences per paragraph — no run-on blocks). The vessel, wash, score slot
 * and drawn card are <Card>'s as everywhere else — the framing is curated
 * and untouched.
 *
 * Reads getRating → commentary (headline + body). Dealt only when the report
 * exists (deck-content); a chart-only entity holds Profile instead.
 */

import { Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getRating } from "../../lib/data/rating.server";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./ScoutingCard.css";

export default function ScoutingCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // The report rides the lean rating payload; the entity's latest season by
  // default (season selection is Profile's affair now).
  const report = createAsync(() => getRating(sport(), type(), id(), ctx.season()));
  const commentary = () => report()?.commentary ?? null;

  // The Scout's one number, shared with the Profile chart (deck-scores).
  const cardScore = createDeckScoreReader(ctx, "scouting");

  return (
    <Show when={commentary()} fallback={<EmptyCard message="No scouting report yet." />}>
      {(c) => (
        <Card id="scouting" as="article" class="scouting-card" aria-label="Scouting" score={cardScore}>
          <p class="card-identifier">The Scout's report</p>
          <Show when={c().headline}>
            <h2 class="card-hook">{c().headline}</h2>
          </Show>
          <GemmaSummary text={c().body} class="scouting-report" />
        </Card>
      )}
    </Show>
  );
}
