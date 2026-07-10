/**
 * SigilCard — Gemma-generated 1-100 synthesis rendered as a tarot card.
 *
 * Score → one of 11 major-arcana archetypes (see ~/scoracleWiki/wiki/
 * Architecture/Vibe Score Surface.md and ./lib/vibe/archetypes.ts).
 *
 * Card / Shell split:
 *   - This file owns CONTENT: the cardBody (archetype art + score + archetype
 *     name + subtext + credit), the corner numeral string, and the
 *     share metadata for the share artifact.
 *   - `<Shell>` owns VESSEL: border, surface, corner-numeral rendering,
 *     padding, canonical 600×348 silhouette. `<ShareTrigger>` is a
 *     sibling component rendered inside the body and positioned absolute
 *     top-right against the Shell's relative root; it dispatches via
 *     `lib/share/dispatch` (native Web Share where available, fallback
 *     modal otherwise).
 *
 * Reversal mechanic: when the score has dropped >= 4 points since the
 * user's last viewing (cached in localStorage per ./lib/vibe/reversal.ts),
 * the central illustration rotates 180° and the italic subtext gains a
 * "↓ from N" suffix. Asymmetric on purpose — quiet on the way up.
 *
 * Null state: handed off to the shared <EmptyCard> (the Veil vibe-card
 * variant + the Veil archetype's "drawn but unread" subtext) — same
 * visual every News-mode tab uses when it has nothing to show.
 */

import { createMemo, Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getSigil } from "../../lib/data/sigil.server";
import { scoreToArchetype } from "../../lib/vibe/archetypes";
import { evaluateReversal } from "../../lib/vibe/reversal";
import { formatDate } from "../../lib/utils/date";
import { tierColor } from "../../lib/utils/tier-color";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import LoadingCard from "./LoadingCard";
import "./content-cards.css";
import "./SigilCard.css";

function formatSigilReader(modelVersion: string): string {
  const normalized = modelVersion.trim().toLowerCase();
  if (normalized.startsWith("gemma")) return "Gemma";
  return "Scoracle";
}

export default function SigilCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // The Sigil product — current synthesis + bounded history. Its own endpoint
  // now (the same product the meta center score reads → query() dedups).
  const data = createAsync(() => getSigil(sport(), type(), id()));
  const vibe = () => data()?.current ?? null;

  const reversal = createMemo(() => {
    const v = vibe();
    if (!v || v.score == null) return { reversed: false, previousScore: null };
    return evaluateReversal({ sport: sport(), type: type(), id: id() }, v.score);
  });

  const archetype = createMemo(() => {
    const v = vibe();
    return v && v.score != null ? scoreToArchetype(v.score) : null;
  });

  const cardBody = (): JSX.Element => {
    const arc = archetype();
    const row = vibe();
    if (!arc || !row || row.score == null) return null;
    return (
      <article class="vibe-card">
        <div class="vibe-art" classList={{ reversed: reversal().reversed }}>
          <img src={`/vibe-art/${arc.slug}.svg`} alt="" crossorigin="anonymous" />
        </div>
        <Show when={reversal().reversed}>
          <span class="card-micro-eyebrow vibe-reversal-cue">Reversed</span>
        </Show>

        <div
          class="vibe-score"
          style={{ color: tierColor(row.score as number) }}
          aria-label={`Sigil score ${row.score} of 100`}
        >
          {row.score}
        </div>

        <div class="vibe-archetype-name">{arc.name}</div>

        <Show when={row.blurb}>
          {(b) => <p class="vibe-blurb">{b()}</p>}
        </Show>

        <div class="vibe-subtext">
          <span>{arc.vibe}</span>
          <Show when={reversal().reversed && reversal().previousScore != null}>
            <span class="vibe-subtext-reversal"> · ↓ from {reversal().previousScore}</span>
          </Show>
        </div>

        <footer class="vibe-credit" aria-hidden="true">
          <span>read by {formatSigilReader(row.model_version)}</span>
          <span class="vibe-credit-dot">·</span>
          <span>{formatDate(row.generated_at)}</span>
        </footer>
      </article>
    );
  };

  return (
    <Show when={vibe()} fallback={<EmptyCard />}>
      {(_row) => (
        <Show when={archetype()} fallback={<EmptyCard />}>
          {(_arc) => (
            <Card
              id="sigil"
              as="article"
              class="vibe-card-shell"
              aria-label="Sigil"
              cornerLabel={archetype()?.numeral}
            >
              {cardBody()}
            </Card>
          )}
        </Show>
      )}
    </Show>
  );
}

export function SigilCardSkeleton() {
  return <LoadingCard label="Sigil" class="vibe-card-shell" />;
}
