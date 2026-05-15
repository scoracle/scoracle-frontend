/**
 * Compose the OG image SVG for a shareable Card.
 *
 * Step 3 ships a placeholder layout (frame + entity-route label) that
 * proves the pipeline end-to-end. Step 4 wires the per-Card-type SVG
 * renderers (VibeCard first) into the central area; the frame +
 * header band + footer band become Card-agnostic.
 *
 * Output dimensions: 1200×630 — the OG standard for X (Twitter),
 * Facebook, iMessage previews. Aspect ratio ≈ 1.91:1.
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

export interface ArtifactInput {
  cardType: string;
  sport: string;
  type: string;
  id: string;
}

const W = 1200;
const H = 630;

export function buildArtifactSvg(input: ArtifactInput): string {
  const { cardType, sport, type, id } = input;
  const cornerLabel = escapeXml(id);
  const subtitle = escapeXml(`${sport} · ${type} · ${id}`);
  const heading = escapeXml(`Scoracle ${cardType}`);

  // SVG layers (no XML comments inline — resvg-wasm rejects `--` per the
  // XML spec, which makes inline annotations a footgun):
  //   1. Bone surface — fills the full 1200×630 canvas
  //   2. Inset stroke — placeholder for the weathered tarot border SVG
  //      that step 4 will swap in
  //   3. Corner numerals (TL + BR rotated) — match Shell's chrome convention
  //   4. Centered heading + subtitle — placeholder copy; per-Card SVG
  //      renderers replace this in step 4
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
  <text x="${W / 2}" y="${H / 2 - 24}" font-family="PT Serif"
        font-size="56" fill="#171717" text-anchor="middle">${heading}</text>
  <text x="${W / 2}" y="${H / 2 + 32}" font-family="PT Serif" font-style="italic"
        font-size="28" fill="#5C5853" text-anchor="middle">${subtitle}</text>
  <text x="${W / 2}" y="${H - 64}" font-family="PT Serif" font-style="italic"
        font-size="20" fill="#9C9890" text-anchor="middle">scoracle.com</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "&" ? "&amp;" :
    c === "'" ? "&apos;" :
    "&quot;",
  );
}
