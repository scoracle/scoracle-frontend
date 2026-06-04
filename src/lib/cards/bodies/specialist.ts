/**
 * Specialist card body — the entity's PEAK skill as a share artifact.
 *
 * Mirrors `SpecialistCard`'s hero: the `is_specialty` datapoint's label, its
 * scarcity line, and its big tier-colored percentile. No chart — the specialty
 * IS the artifact. Returns a `<g>` in the canonical 800×800 body area.
 */
import { escapeXml } from "../../og/escape-xml";
import { tierHex } from "./tier";

export interface SpecialistBodyInput {
  /** The specialty skill name (e.g. "Shot Creation"). */
  label: string;
  /** The specialty's own percentile, 0-100. */
  pct: number;
  /** Scarcity copy (tiered on the peak's cross-entity standing). */
  scarcity: string;
}

const BODY_W = 800;

export function specialistBodySvg(input: SpecialistBodyInput): string {
  const { label, pct, scarcity } = input;
  const cx = BODY_W / 2;
  const color = tierHex(pct);

  return `<g>
  <text x="${cx}" y="120" font-family="PT Serif" font-size="32" fill="#171717"
        text-anchor="middle" letter-spacing="3">SPECIAL</text>
  <text x="${cx}" y="300" font-family="PT Serif" font-size="48" fill="#171717"
        text-anchor="middle">${escapeXml(label)}</text>
  <text x="${cx}" y="360" font-family="PT Serif" font-style="italic"
        font-size="26" fill="#5C5853" text-anchor="middle">${escapeXml(scarcity)}</text>
  <text x="${cx}" y="600" font-family="PT Serif" font-style="italic"
        font-size="200" fill="${color}" text-anchor="middle">${pct.toFixed(1)}</text>
  <text x="${cx}" y="670" font-family="PT Serif" font-size="26" fill="#9C9890"
        text-anchor="middle" letter-spacing="2">OUT OF 100</text>
</g>`;
}
