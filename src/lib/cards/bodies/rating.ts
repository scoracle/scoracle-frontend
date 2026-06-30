/**
 * Rating card body — the entity's PEAK skill as a share artifact.
 *
 * Mirrors `RatingCard`'s hero: the `is_specialty` datapoint's label, its
 * scarcity line, and its big tier-colored percentile. No chart — the peak
 * IS the artifact. Returns a `<g>` in the canonical 800×800 body area.
 */
import { escapeXml } from "../../og/escape-xml";
import { tierHex } from "./tier";
import { TOKEN_HEX } from "./token-hex";

export interface RatingBodyInput {
  /** The peak skill name (e.g. "Shot Creation"). */
  label: string;
  /** The peak's own percentile, 0-100. */
  pct: number;
  /** Scarcity copy (tiered on the peak's cross-entity standing). */
  scarcity: string;
}

const BODY_W = 800;

export function ratingBodySvg(input: RatingBodyInput): string {
  const { label, pct, scarcity } = input;
  const cx = BODY_W / 2;
  const color = tierHex(pct);

  return `<g>
  <text x="${cx}" y="120" font-family="PT Serif" font-size="32" fill="${TOKEN_HEX.text}"
        text-anchor="middle" letter-spacing="3">SIGIL</text>
  <text x="${cx}" y="300" font-family="PT Serif" font-size="48" fill="${TOKEN_HEX.text}"
        text-anchor="middle">${escapeXml(label)}</text>
  <text x="${cx}" y="360" font-family="PT Serif" font-style="italic"
        font-size="26" fill="${TOKEN_HEX.textSecondary}" text-anchor="middle">${escapeXml(scarcity)}</text>
  <text x="${cx}" y="600" font-family="PT Serif" font-style="italic"
        font-size="200" fill="${color}" text-anchor="middle">${pct.toFixed(1)}</text>
  <text x="${cx}" y="670" font-family="PT Serif" font-size="26" fill="${TOKEN_HEX.textTertiary}"
        text-anchor="middle" letter-spacing="2">OUT OF 100</text>
</g>`;
}
