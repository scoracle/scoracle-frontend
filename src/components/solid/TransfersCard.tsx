/**
 * TransfersCard — a team's rumor-linked players ranked by heat. Team-only.
 *
 * Label is sport-aware: "Transfers" (football) / "Trades" (NBA/NFL). Each row
 * links to the player's profile (their Specialist = "what they'd bring"). Heat
 * is the deterministic index; the meta line shows the Gemma stage + grounded
 * summary + cited source once Phase 2 lands (graceful "Reported" until then).
 *
 * Plumbing baseline — reads getTransfers; reuses the RatingList ranked-list style.
 */

import { For, Show, createSignal } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getTransfers } from "../../lib/data/transfers.server";
import { tierColor } from "../../lib/utils/tier-color";
import { transferStageLabel, transferStageColor } from "../../lib/utils/transfer-stage";
import { transferNoun } from "../../lib/cards/card-meta";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./RatingList.css";
import "./TransfersCard.css";

function playerHref(sport: string, id: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=player&id=${id}`;
}

export default function TransfersCard() {
  const ctx = useProfile();
  const { sport, id } = ctx;
  const data = createAsync(() => getTransfers(sport(), id()));
  const noun = () => transferNoun(ctx.sport());

  // Gemma's summary is truncated to one line per row; tapping the blurb expands
  // it (keyed by rank — stable within a board). Multiple rows can be open.
  const [open, setOpen] = createSignal<ReadonlySet<number>>(new Set());
  const isOpen = (rank: number) => open().has(rank);
  const toggle = (rank: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(rank) ? next.delete(rank) : next.add(rank);
      return next;
    });

  return (
    <Show when={data()} fallback={<EmptyCard message="No rumors yet." />}>
      {(d) => (
        <Show when={d().rumors.length > 0} fallback={<EmptyCard message="No rumors yet." />}>
          <Shell as="article" aria-label={noun()}>
            <div class="rating-list">
              <h3 class="rating-list-title">{noun()} · Heat</h3>
              <ol class="rating-list-rows">
                <For each={d().rumors}>
                  {(t) => (
                    <li class="rating-row transfers-row">
                      <span class="rating-row-rank">{t.rank}</span>
                      <div class="transfers-main">
                        <a class="rating-row-name" href={playerHref(sport(), t.id)}>
                          {t.name}
                          <Show when={t.direction === "outgoing"}>
                            <span class="transfers-dir"> · exit</span>
                          </Show>
                        </a>
                        <button
                          type="button"
                          class="transfers-meta-btn"
                          classList={{ open: isOpen(t.rank) }}
                          aria-expanded={isOpen(t.rank)}
                          aria-label={isOpen(t.rank) ? "Collapse summary" : "Expand summary"}
                          onClick={() => toggle(t.rank)}
                        >
                          <span class="transfers-meta">
                            <span class="transfers-stage" style={{ color: transferStageColor(t.stage) }}>
                              {transferStageLabel(t.stage)}
                            </span>
                            <Show when={t.gemma_summary}> · {t.gemma_summary}</Show>
                            <Show when={t.source_attribution}> · per {t.source_attribution}</Show>
                          </span>
                          <span class="transfers-chevron" aria-hidden="true">⌄</span>
                        </button>
                      </div>
                      <span class="rating-row-score transfers-heat" style={{ color: tierColor(t.heat) }}>
                        {t.heat}
                      </span>
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
