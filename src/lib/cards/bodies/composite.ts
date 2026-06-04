/**
 * Composite card body — the rating engine's composite datapoints as a pizza,
 * for the share artifact. Each datapoint is a wedge sized + tier-colored by its
 * 0-100 percentile; the headline is the entity's composite rank.
 *
 * Geometry comes from the SAME `lib/charts/arc-math` the in-app `PizzaChart`
 * uses — one geometry source, no drift (this replaces the old `og/cards/pizza.ts`
 * that hand-rolled its own wedge math). Returns a `<g>` in the 800×800 body area.
 */
import { escapeXml } from "../../og/escape-xml";
import { tierHex } from "./tier";
import {
  describeArc,
  sliceRadius,
  polarToCartesian,
  textAnchor,
} from "../../charts/arc-math";

export interface CompositeStat {
  label: string;
  /** 0-100 percentile — drives wedge length + color. */
  pct: number;
  /** Raw volume, shown under the label. */
  value: string;
}

export interface CompositeBodyInput {
  /** Composite rank 0-100 (the headline). */
  composite: number;
  stats: CompositeStat[];
  /** Optional cohort line, e.g. "midfielders". */
  cohort?: string | null;
}

const BODY_W = 800;
const BODY_H = 800;

export function compositeBodySvg(input: CompositeBodyInput): string {
  const { composite, stats, cohort } = input;
  const cx = BODY_W / 2;
  const cy = 430;
  const innerR = 34;
  const maxR = 230;
  const labelR = maxR + 40;
  const headColor = tierHex(composite);

  const headline = `<text x="${cx}" y="58" font-family="PT Serif" font-size="34"
      fill="#171717" text-anchor="middle" letter-spacing="3">COMPOSITE <tspan
      fill="${headColor}" font-weight="700">${Math.round(composite)}</tspan></text>`;

  if (stats.length === 0) {
    return `<g>${headline}
      <text x="${cx}" y="${cy}" font-family="PT Serif" font-style="italic"
        font-size="28" fill="#9C9890" text-anchor="middle">No rating yet</text>
    </g>`;
  }

  const N = stats.length;
  const step = (2 * Math.PI) / N;
  const pad = N > 1 ? 0.02 : 0;

  // Concentric guide rings (5 tiers).
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]
    .map((t) => {
      const r = innerR + (maxR - innerR) * t;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#9C9890" stroke-width="0.5" stroke-opacity="0.4"/>`;
    })
    .join("\n");

  const wedges: string[] = [];
  const spokes: string[] = [];
  const labels: string[] = [];

  for (let i = 0; i < N; i++) {
    const s = stats[i];
    const start = -Math.PI / 2 + i * step;
    const end = start + step;
    const outer = sliceRadius(s.pct, innerR, maxR);

    wedges.push(
      `<path d="${describeArc(cx, cy, innerR, outer, start, end, pad)}" fill="${tierHex(s.pct)}" fill-opacity="0.82" stroke="#F4F1EB" stroke-width="1.5"/>`,
    );

    const sp1 = polarToCartesian(cx, cy, innerR, start);
    const sp2 = polarToCartesian(cx, cy, maxR, start);
    spokes.push(
      `<line x1="${sp1.x}" y1="${sp1.y}" x2="${sp2.x}" y2="${sp2.y}" stroke="#9C9890" stroke-width="0.5" stroke-opacity="0.35"/>`,
    );

    const mid = start + step / 2;
    const lp = polarToCartesian(cx, cy, labelR, mid);
    const anchor = textAnchor(lp.x - cx);
    labels.push(
      `<text x="${lp.x}" y="${lp.y - 6}" font-family="PT Serif" font-size="15"
        fill="#171717" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(s.label)}</text>`,
    );
    labels.push(
      `<text x="${lp.x}" y="${lp.y + 13}" font-family="PT Serif" font-style="italic"
        font-size="13" fill="#5C5853" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(s.value)}</text>`,
    );
  }

  const cohortLine = cohort
    ? `<text x="${cx}" y="${BODY_H - 24}" font-family="PT Serif" font-style="italic"
        font-size="18" fill="#5C5853" text-anchor="middle">Compared to ${escapeXml(cohort)}</text>`
    : "";

  return `<g>
    ${headline}
    ${rings}
    ${spokes.join("\n")}
    ${wedges.join("\n")}
    ${labels.join("\n")}
    ${cohortLine}
  </g>`;
}
