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
import { describeArc, sliceRadius, polarToCartesian, textAnchor } from "../../charts/arc-math";

export interface CompareBodyStat {
  label: string;
  leftValue: string;
  leftPct: number | null;
  rightValue: string;
  rightPct: number | null;
}

export interface CompareBodyInput {
  /** Headline label (uppercase), e.g. "GENERAL". */
  heading: string;
  aName: string;
  aComposite: number;
  bName: string;
  bComposite: number;
  stats: CompareBodyStat[];
}

const BODY_W = 800;
const BODY_H = 800;
const PAD = 0.02;

export function compareBodySvg(input: CompareBodyInput): string {
  const { heading, aName, aComposite, bName, bComposite, stats } = input;
  const cx = BODY_W / 2;
  const cy = 470;
  const innerR = 24;
  const maxR = 210;
  const labelR = maxR + 34;

  // Headline: the metric, then the two entities + their scoped composites.
  const head = `
    <text x="${cx}" y="44" font-family="PT Serif" font-size="30" fill="#171717"
      text-anchor="middle" letter-spacing="3">${escapeXml(heading)}</text>
    <text x="60" y="120" font-family="PT Serif" font-style="italic" font-size="26" fill="#5C5853">${escapeXml(aName)}</text>
    <text x="60" y="162" font-family="PT Serif" font-size="44" font-weight="700" fill="${tierHex(aComposite)}">${Math.round(aComposite)}</text>
    <text x="${BODY_W - 60}" y="120" font-family="PT Serif" font-style="italic" font-size="26" fill="#5C5853" text-anchor="end">${escapeXml(bName)}</text>
    <text x="${BODY_W - 60}" y="162" font-family="PT Serif" font-size="44" font-weight="700" fill="${tierHex(bComposite)}" text-anchor="end">${Math.round(bComposite)}</text>
    <text x="${cx}" y="150" font-family="PT Serif" font-style="italic" font-size="22" fill="#9C9890" text-anchor="middle">vs</text>`;

  if (stats.length < 2) {
    return `<g>${head}
      <text x="${cx}" y="${cy}" font-family="PT Serif" font-style="italic" font-size="26"
        fill="#9C9890" text-anchor="middle">Not enough shared data to compare</text>
    </g>`;
  }

  const N = stats.length;
  const step = Math.PI / N; // π per side, split across N slices

  const divider = `<line x1="${cx}" y1="${cy - (maxR + 34)}" x2="${cx}" y2="${cy + (maxR + 34)}"
      stroke="#9C9890" stroke-width="0.6" stroke-opacity="0.5"/>`;

  const parts: string[] = [];

  const drawSide = (side: "left" | "right", pct: number | null, value: string, label: string, start: number, end: number) => {
    const mid = (start + end) / 2;
    const lp = polarToCartesian(cx, cy, labelR, mid);
    const anchor = textAnchor(lp.x - cx);
    if (pct == null) {
      const r = innerR + (maxR - innerR) * 0.18;
      const mp = polarToCartesian(cx, cy, r * 0.7 + innerR * 0.3, mid);
      parts.push(`<path d="${describeArc(cx, cy, innerR, r, start, end, PAD)}" fill="none" stroke="#9C9890" stroke-width="1" stroke-opacity="0.5"/>`);
      parts.push(`<text x="${mp.x}" y="${mp.y + 4}" font-family="PT Serif" font-size="14" fill="#9C9890" text-anchor="middle">—</text>`);
    } else {
      const outer = sliceRadius(pct, innerR, maxR);
      parts.push(`<path d="${describeArc(cx, cy, innerR, outer, start, end, PAD)}" fill="${tierHex(pct)}" fill-opacity="0.82" stroke="#F4F1EB" stroke-width="1.5"/>`);
      if (pct >= 20) {
        const ip = polarToCartesian(cx, cy, innerR + (outer - innerR) * 0.6, mid);
        parts.push(`<text x="${ip.x}" y="${ip.y + 4}" font-family="PT Serif" font-size="13" fill="#F4F1EB" text-anchor="middle">${Math.round(pct)}</text>`);
      }
    }
    parts.push(`<text x="${lp.x}" y="${lp.y - 5}" font-family="PT Serif" font-size="14" fill="#171717" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(label)}</text>`);
    parts.push(`<text x="${lp.x}" y="${lp.y + 12}" font-family="PT Serif" font-style="italic" font-size="12" fill="#5C5853" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(value)}</text>`);
  };

  for (let i = 0; i < N; i++) {
    const s = stats[i];
    // Right side (compared / B): top → clockwise.
    drawSide("right", s.rightPct, s.rightValue, s.label, -Math.PI / 2 + i * step, -Math.PI / 2 + (i + 1) * step);
    // Left side (primary / A): mirror across the vertical axis.
    drawSide("left", s.leftPct, s.leftValue, s.label, -Math.PI / 2 - (i + 1) * step, -Math.PI / 2 - i * step);
  }

  return `<g>
    ${head}
    ${divider}
    ${parts.join("\n")}
    <circle cx="${cx}" cy="${cy}" r="${innerR - 2}" fill="#F4F1EB"/>
  </g>`;
}
