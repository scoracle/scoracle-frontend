/**
 * sparkline body — the season Trends share artifact: two stacked sparklines
 * (General/Rating on top, Vibe below) with their tier-colored scores up top,
 * mirroring the in-app MomentumCard. Pure SVG (resvg-safe hex via `tier`), drawn in
 * the 800×800 OG body box. Used by the `trends` OG body (og-bodies.ts).
 */
import { tierHex } from "./tier";
import { escapeXml } from "../../og/escape-xml";
import { TOKEN_HEX } from "./token-hex";

export interface SparklineBodyInput {
  generalScore: number | null;
  generalLabel: string;
  /** Chronological 0-100 series (per-event composite percentile). */
  generalSeries: number[];
  vibeScore: number | null;
  vibeLabel: string;
  /** Chronological 0-100 series (daily sentiment). */
  vibeSeries: number[];
}

const B = 800;

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** A sparkline (50-midline + polyline + dots) in a w×h box at (x, y). */
function spark(series: number[], x: number, y: number, w: number, h: number, color: string): string {
  if (!series.length) return "";
  const PAD = 16;
  const plotW = w - PAD * 2;
  const plotH = h - PAD * 2;
  const n = series.length;
  const xFor = (i: number) => (n <= 1 ? x + w / 2 : x + PAD + (i / (n - 1)) * plotW);
  const yFor = (v: number) => y + PAD + plotH - (clamp(v) / 100) * plotH;
  const midY = yFor(50).toFixed(1);
  const pts = series.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
  const dots = series
    .map((v, i) => `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(v).toFixed(1)}" r="3.4" fill="${color}" stroke="${TOKEN_HEX.bgCard}" stroke-width="1.2"/>`)
    .join("");
  return `<line x1="${x.toFixed(1)}" y1="${midY}" x2="${(x + w).toFixed(1)}" y2="${midY}" stroke="${TOKEN_HEX.textTertiary}" stroke-width="1" stroke-dasharray="3 5" opacity="0.5"/>
  <polyline fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
  ${dots}`;
}

/** One label + score column, centered on cx. */
function score(cx: number, value: number | null, label: string): string {
  if (value == null) return "";
  return `<text x="${cx}" y="84" font-family="PT Serif" font-size="80" fill="${tierHex(value)}" text-anchor="middle">${Math.round(value)}</text>
  <text x="${cx}" y="122" font-family="PT Serif" font-size="22" fill="${TOKEN_HEX.textTertiary}" text-anchor="middle" letter-spacing="3">${escapeXml(label.toUpperCase())}</text>`;
}

/** One sparkline block: caps label above a chart in a w×h box at (x, y). */
function block(label: string, series: number[], color: string, x: number, y: number, w: number, h: number): string {
  if (!series.length) return "";
  return `<text x="${(x + w / 2).toFixed(1)}" y="${y.toFixed(1)}" font-family="PT Serif" font-size="20" fill="${TOKEN_HEX.textTertiary}" text-anchor="middle" letter-spacing="2">${escapeXml(label.toUpperCase())}</text>
  ${spark(series, x, y + 16, w, h, color)}`;
}

export function sparklineBodySvg(input: SparklineBodyInput): string {
  const { generalScore, generalLabel, generalSeries, vibeScore, vibeLabel, vibeSeries } = input;

  // Two scores centered side-by-side (only those present).
  const both = generalScore != null && vibeScore != null;
  const scores = both
    ? score(B * 0.36, generalScore, generalLabel) + score(B * 0.64, vibeScore, vibeLabel)
    : score(B / 2, generalScore ?? vibeScore, generalScore != null ? generalLabel : vibeLabel);

  const X = 70;
  const WIDTH = B - X * 2;
  const general = block(generalLabel, generalSeries, tierHex(generalScore ?? 50), X, 230, WIDTH, 210);
  const vibe = block(vibeLabel, vibeSeries, tierHex(vibeScore ?? 50), X, 510, WIDTH, 210);

  return `${scores}
  ${general}
  ${vibe}`;
}
