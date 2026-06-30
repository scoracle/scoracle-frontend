/**
 * leaderboard body — a top-N ranked-list snapshot for the /leaderboard share
 * card. Pure SVG (resvg-safe hex) drawn in the 800×800 OG body box; the title
 * rides in the card header (supplied via OgBody.header). Used by the `leaderboard`
 * OG body (og-bodies.ts).
 */
import { escapeXml } from "../../og/escape-xml";
import { TOKEN_HEX } from "./token-hex";

export interface LeaderboardBodyRow {
  rank: number;
  name: string;
  metric: string;
  /** Tier hex for the metric (rating/vibe/heat), or null for a neutral count (news). */
  metricColor: string | null;
}

const B = 800;
const ROWS = 10;

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function leaderboardBodySvg(rows: LeaderboardBodyRow[]): string {
  const shown = rows.slice(0, ROWS);
  const rowH = 72;
  const startY = 18;
  return shown
    .map((r, i) => {
      const y = startY + i * rowH;
      const baseline = (y + rowH / 2 + 11).toFixed(0);
      const lineY = (y + rowH).toFixed(0);
      const color = r.metricColor ?? TOKEN_HEX.text;
      return `<text x="38" y="${baseline}" font-family="PT Serif" font-size="28" fill="${TOKEN_HEX.textTertiary}" text-anchor="end">${r.rank}</text>
  <text x="64" y="${baseline}" font-family="PT Serif" font-size="34" fill="${TOKEN_HEX.text}">${escapeXml(truncate(r.name, 24))}</text>
  <text x="${B}" y="${baseline}" font-family="PT Serif" font-size="38" fill="${color}" text-anchor="end">${escapeXml(r.metric)}</text>
  <line x1="0" y1="${lineY}" x2="${B}" y2="${lineY}" stroke="${TOKEN_HEX.textTertiary}" stroke-width="1" opacity="0.22"/>`;
    })
    .join("\n");
}
