/**
 * VibeCard — Gemma-generated 1-100 sentiment rendered as a tarot card.
 *
 * Score → one of 11 major-arcana archetypes (see ~/scoracleWiki/wiki/
 * Architecture/Vibe Score Surface.md and ./lib/vibe/archetypes.ts). Card
 * chrome carries the archetype's Roman numeral in opposing corners
 * (top-left upright + bottom-right rotated 180°) — the v2 tarot-corner-
 * numeral convention.
 *
 * Reversal mechanic: when the score has dropped >= 4 points since the
 * user's last viewing (cached in localStorage per ./lib/vibe/reversal.ts),
 * the central illustration rotates 180° and the italic subtext gains a
 * "↓ from N" suffix. Asymmetric on purpose — quiet on the way up.
 *
 * Null state: deck-back face + "watching for mentions". Rendered when the
 * backend returns null (empty corpus).
 */

import { createMemo, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getVibe } from "../../lib/data/vibe.server";
import { scoreToArchetype } from "../../lib/vibe/archetypes";
import { evaluateReversal } from "../../lib/vibe/reversal";
import { formatDate } from "../../lib/utils/date";
import Skeleton from "./Skeleton";
import "./content-tabs.css";
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

  // Compute reversal verdict + archetype lookup. evaluateReversal reads
  // from + writes to localStorage; the memo re-evaluates whenever the
  // fetched score changes.
  const reversal = createMemo(() => {
    const v = vibe();
    if (!v || v.sentiment == null) return { reversed: false, previousScore: null };
    return evaluateReversal({ sport, type, id }, v.sentiment);
  });

  const archetype = createMemo(() => {
    const v = vibe();
    return v && v.sentiment != null ? scoreToArchetype(v.sentiment) : null;
  });

  return (
    <Show when={vibe()} fallback={<NullCard />}>
      {(row) => (
        <Show when={archetype()} fallback={<NullCard />}>
          {(arc) => (
            <article class="vibe-card">
              <span class="vibe-corner-num vibe-corner-num-tl" aria-hidden="true">{arc().numeral}</span>
              <span class="vibe-corner-num vibe-corner-num-br" aria-hidden="true">{arc().numeral}</span>

              <div class="vibe-art" classList={{ reversed: reversal().reversed }}>
                <img src={`/vibe-art/${arc().slug}.svg`} alt="" />
              </div>

              <div
                class="vibe-score"
                style={{ color: tierColor(row().sentiment as number) }}
                aria-label={`Vibe score ${row().sentiment} of 100`}
              >
                {row().sentiment}
              </div>

              <div class="vibe-archetype-name">{arc().name.toUpperCase()}</div>

              <div class="vibe-subtext">
                <span>{arc().vibe}</span>
                <Show when={reversal().reversed && reversal().previousScore != null}>
                  <span class="vibe-subtext-reversal"> · ↓ from {reversal().previousScore}</span>
                </Show>
              </div>

              <footer class="vibe-credit" aria-hidden="true">
                <span>{row().model_version}</span>
                <span class="vibe-credit-dot">·</span>
                <span>{formatDate(row().generated_at)}</span>
              </footer>
            </article>
          )}
        </Show>
      )}
    </Show>
  );
}

export function VibeCardSkeleton() {
  return (
    <div class="tab-loading-skeleton">
      <Skeleton shape="block" height={300} />
    </div>
  );
}

function NullCard() {
  return (
    <article class="vibe-card vibe-card-null">
      <div class="vibe-deck-back">
        <img src="/vibe-art/deck-back.svg" alt="" />
      </div>
      <div class="vibe-subtext">watching for mentions</div>
    </article>
  );
}
