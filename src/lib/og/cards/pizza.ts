/**
 * Pizza chart body — SVG renderer for a percentile-radial chart.
 *
 * Used by every per-category Stats / Compare share card. Each stat
 * is a wedge whose radial length is `percentile / 100 × maxR`; the
 * wedge is filled with the 5-tier antique-tarot color matching the
 * `--percentile-*` tokens (mirrored as hex because resvg-on-Worker
 * can't resolve CSS custom properties).
 *
 * Returns a `<g>` group positioned relative to the canonical 800×800
 * body area. The composer drops it inside `<g transform="translate(…)">`.
 *
 * Compare overlay: when `compared` is set, each stat gets a SECOND
 * wedge drawn at lower opacity in the same slice, so the two
 * radial profiles read against each other.
 */
import { escapeXml } from "../escape-xml";

const TIER_HEX = {
  elite:   "#7a9b76",
  above:   "#6b8fc7",
  average: "#c9a04a",
  below:   "#c47a5d",
  poor:    "#a85252",
} as const;

function tierColorHex(percentile: number): string {
  if (percentile >= 81) return TIER_HEX.elite;
  if (percentile >= 61) return TIER_HEX.above;
  if (percentile >= 41) return TIER_HEX.average;
  if (percentile >= 21) return TIER_HEX.below;
  return TIER_HEX.poor;
}

export interface PizzaStat {
  /** Stable key (e.g., "passing_yards"). Used for matching the
   *  compared entity's value in the same slice. */
  key: string;
  /** Display label (e.g., "Passing Yards"). */
  label: string;
  /** Raw stat value (formatted upstream). */
  value: number | string;
  /** 0-100. Drives the wedge radial length + tier color. */
  percentile: number;
}

export interface PizzaBodyInput {
  /** Header line above the chart (e.g., "ATTACKING"). */
  title: string;
  /** Stats for the primary entity (rendered as solid wedges). */
  stats: PizzaStat[];
  /** Optional compared stats — same keys as `stats`, used for
   *  the compare overlay. Pizza side renders these as a lower-
   *  opacity inner wedge in the same slice. */
  compared?: PizzaStat[];
  /** Footer line under the chart (e.g., "Compared to point guards"). */
  cohort?: string | null;
}

const BODY_W = 800;
const BODY_H = 800;

export function pizzaBodySvg(input: PizzaBodyInput): string {
  const { title, stats, compared, cohort } = input;
  const cx = BODY_W / 2;
  const cy = 380;
  const maxR = 250;
  const innerR = 30;
  const labelR = maxR + 38;

  if (stats.length === 0) {
    return `<g>
      <text x="${cx}" y="40" font-family="PT Serif"
        font-size="32" fill="#171717" text-anchor="middle"
        letter-spacing="3">${escapeXml(title.toUpperCase())}</text>
      <text x="${cx}" y="${cy}" font-family="PT Serif" font-style="italic"
        font-size="28" fill="#9C9890" text-anchor="middle">No data</text>
    </g>`;
  }

  const N = stats.length;
  const wedgeAngleDeg = 360 / N;
  const comparedMap = new Map<string, PizzaStat>();
  if (compared) for (const s of compared) comparedMap.set(s.key, s);

  // Concentric guide rings — 5 tiers (20/40/60/80/100).
  const rings: string[] = [];
  for (const tier of [0.2, 0.4, 0.6, 0.8, 1.0]) {
    const r = innerR + (maxR - innerR) * tier;
    rings.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#9C9890" stroke-width="0.5" stroke-opacity="0.4"/>`,
    );
  }

  // Wedge separators (radial spokes) — keeps the chart legible at
  // small label counts.
  const spokes: string[] = [];
  for (let i = 0; i < N; i++) {
    const deg = -90 + i * wedgeAngleDeg;
    const rad = (deg * Math.PI) / 180;
    const x1 = cx + innerR * Math.cos(rad);
    const y1 = cy + innerR * Math.sin(rad);
    const x2 = cx + maxR * Math.cos(rad);
    const y2 = cy + maxR * Math.sin(rad);
    spokes.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#9C9890" stroke-width="0.5" stroke-opacity="0.35"/>`,
    );
  }

  const wedges: string[] = [];
  const labels: string[] = [];

  for (let i = 0; i < N; i++) {
    const stat = stats[i];
    const pct = clamp(stat.percentile, 0, 100);
    const r = innerR + (maxR - innerR) * (pct / 100);

    const startDeg = -90 + i * wedgeAngleDeg;
    const endDeg = startDeg + wedgeAngleDeg;
    const wedge = buildWedge(cx, cy, innerR, r, startDeg, endDeg);

    const color = tierColorHex(pct);
    wedges.push(
      `<path d="${wedge}" fill="${color}" fill-opacity="0.78" stroke="#F4F1EB" stroke-width="1.5"/>`,
    );

    // Compare overlay — render the compared wedge under the primary
    // with dashed stroke + lower opacity so the primary still reads
    // as the protagonist of the share artifact.
    const c = comparedMap.get(stat.key);
    if (c) {
      const cPct = clamp(c.percentile, 0, 100);
      const cR = innerR + (maxR - innerR) * (cPct / 100);
      const cWedge = buildWedge(cx, cy, innerR, cR, startDeg, endDeg);
      wedges.push(
        `<path d="${cWedge}" fill="none" stroke="#171717" stroke-width="1.2" stroke-opacity="0.45" stroke-dasharray="3 3"/>`,
      );
    }

    // Label + value at the perimeter.
    const midDeg = startDeg + wedgeAngleDeg / 2;
    const midRad = (midDeg * Math.PI) / 180;
    const lx = cx + labelR * Math.cos(midRad);
    const ly = cy + labelR * Math.sin(midRad);
    const normalized = ((midDeg % 360) + 360) % 360;
    const anchor = normalized > 270 || normalized < 90 ? "start" : "end";
    const dx = anchor === "start" ? 4 : -4;

    labels.push(
      `<text x="${lx + dx}" y="${ly - 6}" font-family="PT Serif"
        font-size="14" fill="#171717" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(stat.label)}</text>`,
    );
    labels.push(
      `<text x="${lx + dx}" y="${ly + 12}" font-family="PT Serif" font-style="italic"
        font-size="13" fill="#5C5853" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(String(stat.value))}</text>`,
    );
  }

  const cohortLine = cohort
    ? `<text x="${cx}" y="${BODY_H - 30}" font-family="PT Serif" font-style="italic"
        font-size="18" fill="#5C5853" text-anchor="middle">Compared to ${escapeXml(cohort)}s</text>`
    : "";

  return `<g>
    <text x="${cx}" y="40" font-family="PT Serif"
      font-size="32" fill="#171717" text-anchor="middle"
      letter-spacing="3">${escapeXml(title.toUpperCase())}</text>
    ${rings.join("\n")}
    ${spokes.join("\n")}
    ${wedges.join("\n")}
    ${labels.join("\n")}
    ${cohortLine}
  </g>`;
}

function buildWedge(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const x1 = cx + outerR * Math.cos(startRad);
  const y1 = cy + outerR * Math.sin(startRad);
  const x2 = cx + outerR * Math.cos(endRad);
  const y2 = cy + outerR * Math.sin(endRad);
  const ix1 = cx + innerR * Math.cos(startRad);
  const iy1 = cy + innerR * Math.sin(startRad);
  const ix2 = cx + innerR * Math.cos(endRad);
  const iy2 = cy + innerR * Math.sin(endRad);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M${ix1},${iy1} L${x1},${y1} A${outerR},${outerR} 0 ${largeArc} 1 ${x2},${y2} L${ix2},${iy2} A${innerR},${innerR} 0 ${largeArc} 0 ${ix1},${iy1} Z`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
