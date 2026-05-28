/**
 * Fetch the weathered tarot border SVG on first use, cache per-Worker.
 *
 * `public/chrome/weathered-tarot-border.svg` is the same asset
 * `.card::before` embeds on the live site via CSS `background-image`.
 * The file uses `viewBox="0 0 100 100" preserveAspectRatio="none"` and
 * `vector-effect="non-scaling-stroke"`, so dropping it into a wider
 * card-area `<svg>` stretches the path geometry but keeps the stroke
 * weight consistent — same look as the in-app card.
 *
 * Returns the inner contents of the file's outer `<svg>` element
 * (everything between `<svg ...>` and `</svg>`) so the caller can
 * embed it inside its own positioning `<svg>` wrapper. This avoids the
 * nested-root-svg quirk that can confuse some SVG renderers.
 */
import type { AssetFetch } from "../utils/cloudflare-env";

let cached: string | null = null;

export async function loadFrameInner(fetchAsset: AssetFetch): Promise<string> {
  if (cached !== null) return cached;
  const res = await fetchAsset("/chrome/weathered-tarot-border.svg");
  if (!res.ok) throw new Error(`frame ${res.status}`);
  const svg = await res.text();
  cached = stripOuterSvg(svg);
  return cached;
}

function stripOuterSvg(svg: string): string {
  const openMatch = svg.match(/<svg\b[^>]*>/);
  const closeIdx = svg.lastIndexOf("</svg>");
  if (!openMatch || closeIdx < 0) return svg;
  const innerStart = openMatch.index! + openMatch[0].length;
  return svg.slice(innerStart, closeIdx).trim();
}
