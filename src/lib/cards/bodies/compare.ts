/**
 * Compare card body — the butterfly comparison for the share artifact.
 *
 * The SVG twin of the in-app <ButterflyChart>: one circular chart split down the
 * vertical axis, the primary entity sweeping the LEFT semicircle and the compared
 * entity the RIGHT, each datapoint a mirrored pair sized + tier-colored by its
 * percentile. Uses the SAME `arc-math` primitives the component uses, so geometry
 * can't drift. Returns a `<g>` in the 800×800 body area.
 */
import { escapeXml } from "../../og/escape-xml";
import { tierHex } from "./tier";
import { TOKEN_HEX } from "./token-hex";
import { describeArc, sliceRadius, polarToCartesian, textAnchor } from "../../charts/arc-math";

export interface CompareBodyStat {
  label: string;
  leftValue: string;
  leftPct: number | null;
  rightValue: string;
  rightPct: number | null;
}

export interface CompareBodyInput {
  /** Primary (left) scoped composite. */
  aComposite: number;
  /** Compared (right) scoped composite. */
  bComposite: number;
  stats: CompareBodyStat[];
}

const BODY_W = 800;
const BODY_H = 800;
const PAD = 0.02;

// Entity tinting — matches ButterflyChart.css: light half-wash backgrounds +
// saturated key swatches. Primary = left (blue), compared = right (mauve).
const PRIMARY_BG = TOKEN_HEX.comparePrimaryBg;
const SECONDARY_BG = TOKEN_HEX.compareSecondaryBg;
const PRIMARY_KEY = "#5b8fc9";
const SECONDARY_KEY = "#b07ba0";

export function compareBodySvg(input: CompareBodyInput): string {
  const { aComposite, bComposite, stats } = input;
  const cx = BODY_W / 2;
  const cy = 440;
  const innerR = 24;
  const maxR = 220;
  const labelR = maxR + 34;

  // Names + meta live in the card's dual header (build-card). The body shows each
  // entity's scoped composite with its color-key swatch (primary left / compared
  // right), then the butterfly. No metric heading — it's a compare card.
  const head = `
    <rect x="40" y="14" width="18" height="18" rx="2" fill="${PRIMARY_KEY}"/>
    <text x="66" y="44" font-family="PT Serif" font-size="48" font-weight="700" fill="${tierHex(aComposite)}">${Math.round(aComposite)}</text>
    <rect x="${BODY_W - 58}" y="14" width="18" height="18" rx="2" fill="${SECONDARY_KEY}"/>
    <text x="${BODY_W - 66}" y="44" font-family="PT Serif" font-size="48" font-weight="700" fill="${tierHex(bComposite)}" text-anchor="end">${Math.round(bComposite)}</text>
    <text x="${cx}" y="40" font-family="PT Serif" font-style="italic" font-size="24" fill="${TOKEN_HEX.textTertiary}" text-anchor="middle">vs</text>`;

  if (stats.length < 2) {
    return `<g>${head}
      <text x="${cx}" y="${cy}" font-family="PT Serif" font-style="italic" font-size="26"
        fill="${TOKEN_HEX.textTertiary}" text-anchor="middle">Not enough shared data to compare</text>
    </g>`;
  }

  const N = stats.length;
  const step = Math.PI / N; // π per side, split across N slices

  const divider = `<line x1="${cx}" y1="${cy - (maxR + 34)}" x2="${cx}" y2="${cy + (maxR + 34)}"
      stroke="${TOKEN_HEX.textTertiary}" stroke-width="0.6" stroke-opacity="0.5"/>`;

  const parts: string[] = [];

  const drawSide = (side: "left" | "right", pct: number | null, value: string, label: string, start: number, end: number) => {
    const mid = (start + end) / 2;
    const lp = polarToCartesian(cx, cy, labelR, mid);
    const anchor = textAnchor(lp.x - cx);
    if (pct == null) {
      const r = innerR + (maxR - innerR) * 0.18;
      const mp = polarToCartesian(cx, cy, r * 0.7 + innerR * 0.3, mid);
      parts.push(`<path d="${describeArc(cx, cy, innerR, r, start, end, PAD)}" fill="none" stroke="${TOKEN_HEX.textTertiary}" stroke-width="1" stroke-opacity="0.5"/>`);
      parts.push(`<text x="${mp.x}" y="${mp.y + 4}" font-family="PT Serif" font-size="14" fill="${TOKEN_HEX.textTertiary}" text-anchor="middle">—</text>`);
    } else {
      const outer = sliceRadius(pct, innerR, maxR);
      parts.push(`<path d="${describeArc(cx, cy, innerR, outer, start, end, PAD)}" fill="${tierHex(pct)}" fill-opacity="0.82" stroke="${TOKEN_HEX.bgCard}" stroke-width="1.5"/>`);
      if (pct >= 20) {
        const ip = polarToCartesian(cx, cy, innerR + (outer - innerR) * 0.6, mid);
        parts.push(`<text x="${ip.x}" y="${ip.y + 4}" font-family="PT Serif" font-size="13" fill="${TOKEN_HEX.bgCard}" text-anchor="middle">${Math.round(pct)}</text>`);
      }
    }
    parts.push(`<text x="${lp.x}" y="${lp.y - 5}" font-family="PT Serif" font-size="14" fill="${TOKEN_HEX.text}" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(label)}</text>`);
    parts.push(`<text x="${lp.x}" y="${lp.y + 12}" font-family="PT Serif" font-style="italic" font-size="12" fill="${TOKEN_HEX.textSecondary}" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(value)}</text>`);
  };

  for (let i = 0; i < N; i++) {
    const s = stats[i];
    // Right side (compared / B): top → clockwise.
    drawSide("right", s.rightPct, s.rightValue, s.label, -Math.PI / 2 + i * step, -Math.PI / 2 + (i + 1) * step);
    // Left side (primary / A): mirror across the vertical axis.
    drawSide("left", s.leftPct, s.leftValue, s.label, -Math.PI / 2 - (i + 1) * step, -Math.PI / 2 - i * step);
  }

  // Entity-tinted half-discs behind the slices (left = primary, right = compared),
  // mirroring ButterflyChart's BackgroundHalf.
  const halfR = maxR + 40;
  const washes = `
    <path d="${describeArc(cx, cy, 0, halfR, Math.PI / 2, (3 * Math.PI) / 2, 0)}" fill="${PRIMARY_BG}" fill-opacity="0.85"/>
    <path d="${describeArc(cx, cy, 0, halfR, -Math.PI / 2, Math.PI / 2, 0)}" fill="${SECONDARY_BG}" fill-opacity="0.85"/>`;

  return `<g>
    ${head}
    ${washes}
    ${divider}
    ${parts.join("\n")}
    <circle cx="${cx}" cy="${cy}" r="${innerR - 2}" fill="${TOKEN_HEX.bgCard}"/>
  </g>`;
}
