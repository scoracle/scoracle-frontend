/**
 * Meta card body — the entity's three pillar scores (Composite / Specialist /
 * Vibe), mirroring `EntityMeta`. This is the default profile-share artifact:
 * sharing a profile (or any not-yet-bespoke card) renders this score row.
 *
 * Returns a `<g>` in the canonical 800×800 body area. Extracted from the OG
 * handler — the handler used to render this inline; it now lives here as a
 * shared body module like every other card.
 */
import { escapeXml } from "../../og/escape-xml";
import { tierHex } from "./tier";

export interface MetaScore {
  label: string;
  /** 0-100 percentile (Composite/Specialist) or 0-100 sentiment (Vibe). */
  value: number;
  /** Optional sub-label under the score (e.g. the specialty name). */
  sublabel?: string | null;
}

export function metaBodySvg(scores: MetaScore[]): string {
  const valid = scores.filter((s) => s.value != null);
  if (valid.length === 0) {
    return `<g><text x="400" y="380" font-family="PT Serif" font-style="italic"
      font-size="28" fill="#9C9890" text-anchor="middle">No rating yet</text></g>`;
  }
  const n = valid.length;
  const cells = valid
    .map((s, i) => {
      const cx = (800 * (i + 1)) / (n + 1);
      const color = tierHex(s.value);
      const sub = s.sublabel
        ? `<text x="${cx}" y="510" font-family="PT Serif" font-style="italic"
            font-size="24" fill="#5C5853" text-anchor="middle">${escapeXml(s.sublabel)}</text>`
        : "";
      return `
      <text x="${cx}" y="410" font-family="PT Serif" font-size="110" font-weight="700"
        fill="${color}" text-anchor="middle">${Math.round(s.value)}</text>
      <text x="${cx}" y="465" font-family="PT Serif" font-size="28" fill="#171717"
        text-anchor="middle" letter-spacing="2">${escapeXml(s.label.toUpperCase())}</text>
      ${sub}`;
    })
    .join("\n");
  return `<g>
    <text x="400" y="150" font-family="PT Serif" font-size="32" fill="#171717"
      text-anchor="middle" letter-spacing="3">SEASON RATING</text>
    ${cells}
  </g>`;
}
