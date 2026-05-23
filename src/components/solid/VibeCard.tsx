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
 *   - `<Shell>` owns VESSEL: border, surface, corner-numeral rendering,
 *     padding, canonical 600×348 silhouette. ShareButton is a sibling
 *     component rendered inside the body and positioned absolute
 *     top-right against the Shell's relative root.
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
import { scoreToArchetype, type Archetype } from "../../lib/vibe/archetypes";
import { evaluateReversal } from "../../lib/vibe/reversal";
import { formatDate } from "../../lib/utils/date";
import { readShareEntity } from "../../lib/utils/share-entity";
import { escapeXml } from "../../lib/og/escape-xml";
import { ShareButton } from "../../lib/share";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import { tierColor } from "../../lib/utils/score-tier";
import "./content-cards.css";
import "./VibeCard.css";

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

  const canonicalUrl = (): string =>
    `https://scoracle.com/profile?sport=${sport.toUpperCase()}&type=${type}&id=${id}&tab=vibes`;

  return (
    <Show when={vibe()} fallback={<EmptyCard />}>
      {(_row) => (
        <Show when={archetype()} fallback={<EmptyCard />}>
          {(_arc) => (
            <Shell
              as="article"
              class="vibe-card-shell"
              aria-label="Vibe"
              cornerLabel={archetype()?.numeral}
            >
              {cardBody()}
              <ShareButton
                url={canonicalUrl()}
                text={shareText()}
                ariaLabel="Share this vibe card"
              />
            </Shell>
          )}
        </Show>
      )}
    </Show>
  );
}

export function VibeCardSkeleton() {
  return (
    <Shell as="article" class="vibe-card-shell" aria-label="Vibe">
      <div class="card-loading">
        <Skeleton shape="block" height={300} />
      </div>
    </Shell>
  );
}

// ─── OG / share artifact renderer ───────────────────────────────────────────
//
// `vibeArtifactSvg` is the SVG mirror of `cardBody()` above, called from the
// server-side OG image route (`src/routes/og/[...]`). Co-located here so the
// DOM render and the SVG render stay visually in sync — any edit to one
// reminds you to touch the other.
//
// Pure function: takes resolved data, returns an SVG `<g>` string positioned
// absolutely within the 1200×630 OG canvas. No Solid signals, no async.

/** Hex equivalents of the `--percentile-*` tokens. Mirrors `tierColor` above
 *  for SVG-context (where CSS custom properties don't resolve). */
const TIER_HEX = {
  elite:   "#7a9b76",
  above:   "#6b8fc7",
  average: "#c9a04a",
  below:   "#c47a5d",
  poor:    "#a85252",
} as const;

export function tierColorHex(score: number): string {
  if (score >= 81) return TIER_HEX.elite;
  if (score >= 61) return TIER_HEX.above;
  if (score >= 41) return TIER_HEX.average;
  if (score >= 21) return TIER_HEX.below;
  return TIER_HEX.poor;
}

export interface VibeArtifactInput {
  /** Numeric sentiment 1-100. */
  score: number;
  /** Resolved archetype from `scoreToArchetype(score)`. */
  archetype: Archetype;
  /** Inline base64 data URI for the archetype illustration (loaded by the
   *  caller from `public/vibe-art/<slug>.svg`). */
  vibeArtDataUri: string;
  /** Backend model version + `generated_at` timestamp — rendered in the
   *  small credit row at the bottom of the card area. */
  modelVersion: string;
  generatedAt: string;
}

/** Card-area dimensions for the OG artifact (matches the locked Shell
 *  silhouette scaled for the 1200×630 OG canvas). Caller positions the
 *  rendered `<g>` at the right canvas offset via a translate transform. */
export const VIBE_CARD_AREA = { w: 700, h: 405 } as const;

/**
 * Render the VibeCard as SVG content positioned within a 700×405 card-area
 * box at origin (0,0). The caller (`src/lib/og/build-artifact.ts`) wraps
 * this in `<g transform="translate(x, y)">` to drop it inside the OG's
 * card area, with the weathered tarot border drawn around it.
 *
 * Layout mirrors the DOM `cardBody`: corner numerals at TL + BR (rotated),
 * vibe-art at the top centered (130×130), large italic tier-colored score,
 * caps archetype name, italic subtext, small credit row at the bottom.
 */
export function vibeArtifactSvg(input: VibeArtifactInput): string {
  const { score, archetype, vibeArtDataUri, modelVersion, generatedAt } = input;
  const color = tierColorHex(score);
  const numeral = escapeXml(archetype.numeral);
  const name = escapeXml(archetype.name.toUpperCase());
  const subtext = escapeXml(archetype.vibe);
  const credit = escapeXml(`${modelVersion}  ·  ${formatDate(generatedAt)}`);

  const { w: W, h: H } = VIBE_CARD_AREA;
  const cx = W / 2;

  return `<g>
  <text x="22" y="38" font-family="PT Serif" font-style="italic"
        font-size="20" fill="#9C9890">${numeral}</text>
  <text x="${W - 22}" y="${H - 22}" font-family="PT Serif" font-style="italic"
        font-size="20" fill="#9C9890" text-anchor="end"
        transform="rotate(180, ${W - 22}, ${H - 22})">${numeral}</text>
  <image href="${vibeArtDataUri}" x="${cx - 65}" y="22" width="130" height="130" preserveAspectRatio="xMidYMid meet"/>
  <text x="${cx}" y="245" font-family="PT Serif" font-style="italic"
        font-size="110" fill="${color}" text-anchor="middle">${score}</text>
  <text x="${cx}" y="294" font-family="PT Serif"
        font-size="28" fill="#171717" text-anchor="middle"
        letter-spacing="3">${name}</text>
  <text x="${cx}" y="324" font-family="PT Serif" font-style="italic"
        font-size="20" fill="#5C5853" text-anchor="middle">${subtext}</text>
  <text x="${cx}" y="380" font-family="PT Serif"
        font-size="14" fill="#9C9890" text-anchor="middle">${credit}</text>
</g>`;
}
