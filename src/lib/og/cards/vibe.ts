/**
 * Vibe card body — SVG renderer for the 1-100 Gemma sentiment card.
 *
 * Returns a `<g>` group positioned relative to a 800×800 body area
 * (the canonical body area exported from `build-card.ts`). The
 * composer drops this inside `<g transform="translate(BODY_X, BODY_Y)">`.
 *
 * Mirrors the in-app DOM render in `src/components/solid/VibeCard.tsx`'s
 * `cardBody()` so the share artifact reads like the live card —
 * archetype illustration, large italic tier-colored score, caps name,
 * italic subtext, credit row.
 *
 * Tier colors mirror the `--percentile-*` tokens. Resvg doesn't resolve
 * CSS custom properties so we duplicate the hex values here.
 */
import { escapeXml } from "../escape-xml";
import { formatDate } from "../../utils/date";
import type { Archetype } from "../../vibe/archetypes";

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

export interface VibeBodyInput {
  /** Numeric sentiment 1-100. */
  score: number;
  /** Resolved archetype from `scoreToArchetype(score)`. */
  archetype: Archetype;
  /** Inline base64 data URI for the archetype illustration (loaded by
   *  the caller from `public/vibe-art/<slug>.svg`). */
  vibeArtDataUri: string;
  /** Backend model version + `generated_at` timestamp — rendered in
   *  the small credit row at the bottom of the body. */
  modelVersion: string;
  generatedAt: string;
}

const BODY_W = 800;
const BODY_H = 800;

export function vibeBodySvg(input: VibeBodyInput): string {
  const { score, archetype, vibeArtDataUri, modelVersion, generatedAt } = input;
  const color = tierColorHex(score);
  const name = escapeXml(archetype.name.toUpperCase());
  const subtext = escapeXml(archetype.vibe);
  const credit = escapeXml(`${modelVersion}  ·  ${formatDate(generatedAt)}`);

  const cx = BODY_W / 2;
  const artSize = 260;
  const artX = cx - artSize / 2;
  const artY = 20;

  return `<g>
  <image href="${vibeArtDataUri}" x="${artX}" y="${artY}" width="${artSize}" height="${artSize}" preserveAspectRatio="xMidYMid meet"/>
  <text x="${cx}" y="490" font-family="PT Serif" font-style="italic"
        font-size="200" fill="${color}" text-anchor="middle">${score}</text>
  <text x="${cx}" y="565" font-family="PT Serif"
        font-size="40" fill="#171717" text-anchor="middle"
        letter-spacing="4">${name}</text>
  <text x="${cx}" y="615" font-family="PT Serif" font-style="italic"
        font-size="28" fill="#5C5853" text-anchor="middle">${subtext}</text>
  <text x="${cx}" y="770" font-family="PT Serif"
        font-size="18" fill="#9C9890" text-anchor="middle">${credit}</text>
</g>`;
}
