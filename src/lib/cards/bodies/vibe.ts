/**
 * Vibe card body — SVG renderer for the 1-100 Gemma sentiment card.
 *
 * Returns a `<g>` group in the canonical 800×800 body area (`build-card.ts`
 * drops it inside `<g transform="translate(BODY_X, BODY_Y)">`). Mirrors the
 * in-app `SigilCard` render — archetype illustration, large italic tier-colored
 * score, caps name, italic subtext, credit row — so the share artifact reads
 * like the live card.
 *
 * One body, two render paths: this is the single Vibe renderer (OG today; the
 * in-app card converges onto it via `<svg innerHTML>` in the follow-on).
 */
import { escapeXml } from "../../og/escape-xml";
import { formatDate } from "../../utils/date";
import { tierHex } from "./tier";
import type { Archetype } from "../../vibe/archetypes";

export interface VibeBodyInput {
  /** Numeric sentiment 1-100. */
  score: number;
  /** Resolved archetype from `scoreToArchetype(score)`. */
  archetype: Archetype;
  /** Inline base64 data URI for the archetype illustration. */
  vibeArtDataUri: string;
  /** Backend model version + `generated_at` — the small credit row. */
  modelVersion: string;
  generatedAt: string;
}

const BODY_W = 800;

export function vibeBodySvg(input: VibeBodyInput): string {
  const { score, archetype, vibeArtDataUri, modelVersion, generatedAt } = input;
  const color = tierHex(score);
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
