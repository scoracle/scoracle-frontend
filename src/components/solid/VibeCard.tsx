/**
 * VibeCard — Gemma-generated 1-100 sentiment rendered as a tarot card.
 *
 * Score → one of 11 major-arcana archetypes (see ~/scoracleWiki/wiki/
 * Architecture/Vibe Score Surface.md and ./lib/vibe/archetypes.ts).
 *
 * Card / Shell split:
 *   - This file owns CONTENT: the cardBody (vibe-art + score + archetype
 *     name + subtext + credit), the corner numeral string, and the
 *     share metadata for the share artifact.
 *   - `<Shell template="standard" share={...}>` owns VESSEL: border,
 *     surface, corner-numeral rendering, share button, modal, frame
 *     composition, snapshot pipeline. Set-and-forget.
 *
 * Reversal mechanic: when the score has dropped >= 4 points since the
 * user's last viewing (cached in localStorage per ./lib/vibe/reversal.ts),
 * the central illustration rotates 180° and the italic subtext gains a
 * "↓ from N" suffix. Asymmetric on purpose — quiet on the way up.
 *
 * Null state: handed off to the shared <EmptyCard> (deck-back face +
 * "watching for mentions") — same visual every News-mode tab uses when
 * it has nothing to show.
 */

import { createMemo, Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getVibe } from "../../lib/data/vibe.server";
import { scoreToArchetype } from "../../lib/vibe/archetypes";
import { evaluateReversal } from "../../lib/vibe/reversal";
import { formatDate } from "../../lib/utils/date";
import { readShareEntity } from "../../lib/utils/share-entity";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./VibeCard.css";

/**
 * Map score 1-100 to one of the 5 percentile-tier colors used by PizzaChart.
 * Same palette across the site so a 73 in the vibe card reads the same
 * "above-average" green-blue as a 73 in a stats-percentile slice.
 */
function tierColor(score: number): string {
  if (score >= 81) return "var(--percentile-elite)";
  if (score >= 61) return "var(--percentile-above)";
  if (score >= 41) return "var(--percentile-average)";
  if (score >= 21) return "var(--percentile-below)";
  return "var(--percentile-poor)";
}

export default function VibeCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const vibe = createAsync(() => getVibe(sport, type, id));

  const reversal = createMemo(() => {
    const v = vibe();
    if (!v || v.sentiment == null) return { reversed: false, previousScore: null };
    return evaluateReversal({ sport, type, id }, v.sentiment);
  });

  const archetype = createMemo(() => {
    const v = vibe();
    return v && v.sentiment != null ? scoreToArchetype(v.sentiment) : null;
  });

  const entity = createMemo(() => readShareEntity(sport, type, id));

  const cardBody = (): JSX.Element => {
    const arc = archetype();
    const row = vibe();
    if (!arc || !row || row.sentiment == null) return null;
    return (
      <article class="vibe-card">
        <div class="vibe-art" classList={{ reversed: reversal().reversed }}>
          <img src={`/vibe-art/${arc.slug}.svg`} alt="" crossorigin="anonymous" />
        </div>

        <div
          class="vibe-score"
          style={{ color: tierColor(row.sentiment as number) }}
          aria-label={`Vibe score ${row.sentiment} of 100`}
        >
          {row.sentiment}
        </div>

        <div class="vibe-archetype-name">{arc.name.toUpperCase()}</div>

        <div class="vibe-subtext">
          <span>{arc.vibe}</span>
          <Show when={reversal().reversed && reversal().previousScore != null}>
            <span class="vibe-subtext-reversal"> · ↓ from {reversal().previousScore}</span>
          </Show>
        </div>

        <footer class="vibe-credit" aria-hidden="true">
          <span>{row.model_version}</span>
          <span class="vibe-credit-dot">·</span>
          <span>{formatDate(row.generated_at)}</span>
        </footer>
      </article>
    );
  };

  const shareText = (): string => {
    const arc = archetype();
    const score = vibe()?.sentiment;
    const e = entity();
    if (arc && score != null && e?.name) {
      return `${e.name} · vibe ${score} · ${arc.name}`;
    }
    return "Scoracle vibe";
  };

  return (
    <Show when={vibe()} fallback={<EmptyCard />}>
      {(_row) => (
        <Show when={archetype()} fallback={<EmptyCard />}>
          {(_arc) => (
            <Shell
              as="article"
              template="standard"
              class="vibe-card-shell"
              aria-label="Vibe"
              cornerLabel={archetype()?.numeral}
              share={{
                cardType: "vibe",
                entity: { sport, type, id },
                tab: "vibes",
                name: entity()?.name ?? "Scoracle",
                text: shareText(),
                primary: {
                  imageUrl: entity()?.imageUrl ?? "",
                  context: entity()?.context ?? "",
                },
                computedAt: vibe()?.generated_at,
              }}
            >
              {cardBody()}
            </Shell>
          )}
        </Show>
      )}
    </Show>
  );
}

export function VibeCardSkeleton() {
  return (
    <Shell as="article" template="standard" class="vibe-card-shell" aria-label="Vibe">
      <div class="card-loading">
        <Skeleton shape="block" height={300} />
      </div>
    </Shell>
  );
}
