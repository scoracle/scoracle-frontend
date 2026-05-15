/**
 * Compose the OG image SVG for a shareable Card.
 *
 * The dispatcher pattern: the caller (the OG route handler) resolves the
 * per-Card-type inner content (a `<g>` group string) by fetching the data
 * and calling the right Card's exported SVG renderer (e.g.,
 * `vibeArtifactSvg` from VibeCard.tsx). `buildArtifactSvg` composes that
 * inner content inside the platform frame.
 *
 * Step 4a wires VibeCard end-to-end. The frame is still a placeholder
 * (Bone surface + plain inset stroke + corner IDs + bottom site mark);
 * step 4b swaps in the weathered tarot border asset + entity-image header
 * band + canonical-URL footer band.
 *
 * Output dimensions: 1200×630 — the OG standard for X / Facebook /
 * iMessage previews. Aspect ratio ≈ 1.91:1.
 *
 * Palette pulled from `@scoracle/tokens@0.4.0` whisper-warm-neutral
 * values directly (the OG SVG can't use CSS custom properties since
 * resvg renders without a browser CSS engine):
 *   --bg-card     #F4F1EB
 *   --text        #171717
 *   --text-secondary  #5C5853
 *   --text-tertiary   #9C9890
 *   --border      #B0ACA4
 */
import { escapeXml } from "./escape-xml";

export interface ArtifactInput {
  cardType: string;
  sport: string;
  type: string;
  id: string;
  /** Inner SVG content (`<g>...</g>`) produced by the Card's SVG renderer.
   *  When omitted, a centered route-keyed placeholder fills the card area. */
  innerSvg?: string;
}

const W = 1200;
const H = 630;

export function buildArtifactSvg(input: ArtifactInput): string {
  const { cardType, sport, type, id, innerSvg } = input;
  const cornerLabel = escapeXml(id);

  // Inner content: per-Card SVG if supplied, otherwise a centered route-
  // keyed placeholder. This is the slot per-Card renderers fill in.
  const inner = innerSvg ?? placeholderInner(cardType, sport, type, id);

  // SVG layers:
  //   1. Bone surface — fills the full 1200×630 canvas
  //   2. Inset stroke — placeholder for the weathered tarot border SVG
  //      that step 4b will swap in
  //   3. Corner numerals (TL + BR rotated) — match Shell's chrome convention
  //   4. Per-Card inner content (the picture inside the frame)
  //   5. Footer site mark
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#F4F1EB"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none"
        stroke="#B0ACA4" stroke-width="2"/>
  <text x="64" y="80" font-family="PT Serif" font-style="italic"
        font-size="22" fill="#9C9890">${cornerLabel}</text>
  <text x="${W - 64}" y="${H - 60}" font-family="PT Serif" font-style="italic"
        font-size="22" fill="#9C9890" text-anchor="end"
        transform="rotate(180, ${W - 64}, ${H - 60})">${cornerLabel}</text>
  ${inner}
  <text x="${W / 2}" y="${H - 64}" font-family="PT Serif" font-style="italic"
        font-size="20" fill="#9C9890" text-anchor="middle">scoracle.com</text>
</svg>`;
}

function placeholderInner(
  cardType: string,
  sport: string,
  type: string,
  id: string,
): string {
  const heading = escapeXml(`Scoracle ${cardType}`);
  const subtitle = escapeXml(`${sport} · ${type} · ${id}`);
  return `<text x="${W / 2}" y="${H / 2 - 24}" font-family="PT Serif"
        font-size="56" fill="#171717" text-anchor="middle">${heading}</text>
  <text x="${W / 2}" y="${H / 2 + 32}" font-family="PT Serif" font-style="italic"
        font-size="28" fill="#5C5853" text-anchor="middle">${subtitle}</text>`;
}
