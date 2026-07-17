/**
 * SigilCard — Gemma-generated 1-100 synthesis rendered as a tarot card,
 * voiced by the Oracle reading.
 *
 * Score → one of 11 major-arcana archetypes (see scoracle-wiki/wiki/
 * Architecture/Vibe Score Surface.md and ./lib/vibe/archetypes.ts).
 *
 * Card / Shell split:
 *   - This file owns CONTENT: the cardBody (archetype art + score + archetype
 *     name + omen seal + reading + subtext + credit) and the corner numeral
 *     string.
 *   - `<Card>` owns the vessel + card-token chrome: Shell border/surface/
 *     corner numerals, the identity band, and the CopyCardButton.
 *
 * Voice: the card's prose is the Oracle reading (`oracle.reading`), the
 * persona voice over the decided synthesis — the Seal treatment Scott picked
 * 2026-07-16: a hairline seal carrying the computed omen (glyph + word)
 * between the decided card and its voice. The synthesis blurb is internal
 * scaffolding and is never rendered. No reading → no seal, no voice line;
 * the decided fields still render.
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
import { tierColor } from "../../lib/utils/tier-color";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./SigilCard.css";

function formatSigilReader(modelVersion: string): string {
  const normalized = modelVersion.trim().toLowerCase();
  if (normalized.startsWith("gemma")) return "Gemma";
  return "Scoracle";
}

/** Seal glyph per omen — the backend's closed set (oracle.rs OMENS). An
 *  unrecognized value renders the word without a mark rather than guessing. */
const OMEN_MARKS: Record<string, string> = {
  ascendant: "✶",
  steady: "◆",
  waning: "☾",
  crossroads: "✕",
};

/** The card's timestamp — first-class since serve-latest (Scott, 2026-07-16):
 *  the API serves the most recent reading at ANY age, so the drawn date is the
 *  honesty mechanism. Same "Jul 10" cut as formatDate, plus the year once a
 *  reading has outlived the current one. */
function formatDrawnDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export default function SigilCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // The Sigil product — current synthesis + bounded history. Its own endpoint
  // now (the same product the meta center score reads → query() dedups).
  const data = createAsync(() => getSigil(sport(), type(), id()));
  const vibe = () => data()?.current ?? null;
  // The card's voice. SOLE access point for the oracle payload key — Session C
  // folds it into `current`, and this accessor is the one line that changes.
  const oracle = () => data()?.oracle ?? null;

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

        <Show when={oracle()?.reading}>
          {(reading) => (
            <>
              <Show when={oracle()?.omen}>
                {(omen) => (
                  <div class="omen-seal" aria-label={`Omen: ${omen()}`}>
                    <span class="omen-seal-rule" />
                    <Show when={OMEN_MARKS[omen()]}>
                      <span class="omen-seal-mark" aria-hidden="true">{OMEN_MARKS[omen()]}</span>
                    </Show>
                    <span class="omen-seal-word">{omen()}</span>
                    <span class="omen-seal-rule" />
                  </div>
                )}
              </Show>
              <p class="vibe-reading">{reading()}</p>
            </>
          )}
        </Show>

        <div class="vibe-subtext">
          <span>{arc.vibe}</span>
          <Show when={reversal().reversed && reversal().previousScore != null}>
            <span class="vibe-subtext-reversal"> · ↓ from {reversal().previousScore}</span>
          </Show>
        </div>

        {/* Leads with the drawn date (the voice's own timestamp when a reading
            exists, the synthesis's otherwise) — under serve-latest an aged
            reading is honest, not hidden. */}
        <footer class="vibe-credit" aria-hidden="true">
          <span>drawn {formatDrawnDate(oracle()?.generated_at ?? row.generated_at)}</span>
          <span class="vibe-credit-dot">·</span>
          <span>read by {formatSigilReader(row.model_version)}</span>
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
            >
              <p class="card-identifier">Season synthesis, read as a sigil</p>
              {cardBody()}
            </Card>
          )}
        </Show>
      )}
    </Show>
  );
}
