/**
 * build-card — compose the vertical 5:7 tarot share-card SVG.
 *
 * Output: 1000×1400 PNG, attached directly to social posts via the
 * Web Share API (see `src/lib/share/dispatch.ts`). One shape, one
 * builder — the canonical card silhouette across mobile, the future
 * app, and every shared artifact.
 *
 *   ┌────────────────────────────────────────┐  y=0     ← canvas
 *   │                                        │
 *   │  ┌──────────────────────────────────┐  │  y=50    ← card frame
 *   │  │ HEADER (primary, top-left)       │  │
 *   │  │   [logo 100]  Name               │  │
 *   │  │               Subtitle           │  │
 *   │  │                                  │  │
 *   │  │ HEADER (compared, top-right)     │  │
 *   │  │   (only on compare cards)        │  │
 *   │  │                                  │  │
 *   │  │  ─────────────────────────────   │  │  y=300
 *   │  │                                  │  │
 *   │  │  BODY (innerSvg, 800×800)        │  │
 *   │  │   per-card artifact: vibe wheel, │  │
 *   │  │   pizza chart, comparison, etc.  │  │
 *   │  │                                  │  │
 *   │  │  ─────────────────────────────   │  │  y=1180
 *   │  │  scoracle.com         2026-05-23 │  │
 *   │  └──────────────────────────────────┘  │  y=1350
 *   │                                        │
 *   └────────────────────────────────────────┘  y=1400
 *
 * Palette (hex literals — resvg doesn't resolve CSS custom properties;
 * mirrors `@scoracle/tokens@0.4.0`):
 *   --bg              #EAE5DD   canvas surface
 *   --bg-card         #F4F1EB   card surface
 *   --text            #171717
 *   --text-secondary  #5C5853
 *   --text-tertiary   #9C9890
 */
import { escapeXml } from "./escape-xml";

const W = 1000;
const H = 1400;
const PAD = 50;
const CARD_X = PAD;
const CARD_Y = PAD;
const CARD_W = W - PAD * 2; // 900
const CARD_H = H - PAD * 2; // 1300

const BODY_X = 100;
const BODY_Y = 350;
const BODY_W = 800;
const BODY_H = 800;

export interface CardEntityFacts {
  name: string;
  /** Pre-fetched base64 data URI of the logo / photo. When null, the
   *  header band renders text only (no image slot). */
  imageDataUri: string | null;
  /** Sub-line shown under name. Player: `position · team`. Team:
   *  `conference` or `city`. */
  subtitle: string;
}

export interface BuildCardInput {
  /** Per-card SVG body (`<g>` group string) — coords RELATIVE to a
   *  800×800 box at origin (0,0). Caller's Card body renderer
   *  produces this. */
  innerSvg?: string;
  /** Inner contents of `public/chrome/weathered-tarot-border.svg`
   *  (everything between the outer `<svg>` tags). Loaded via
   *  `loadFrameInner`. */
  frameInnerSvg: string;
  /** Primary entity meta — top-left header block. */
  primary?: CardEntityFacts | null;
  /** Compared entity meta — top-right header block. Only set when
   *  rendering a compare card. */
  compared?: CardEntityFacts | null;
  /** Footer-left line: canonical URL minus protocol. */
  canonicalUrl?: string;
  /** Footer-right line: formatted date + card-type. */
  footerRight?: string;
  /** Single-character or short corner numeral. Drawn at TL and BR
   *  (rotated 180°). Optional. */
  cornerLabel?: string;
}

export function buildCardSvg(input: BuildCardInput): string {
  const {
    innerSvg,
    frameInnerSvg,
    primary,
    compared,
    canonicalUrl,
    footerRight,
    cornerLabel,
  } = input;

  const primaryHeader = primary
    ? composeHeader(primary, { x: CARD_X + 40, anchor: "start" })
    : "";
  const comparedHeader = compared
    ? composeHeader(compared, { x: CARD_X + CARD_W - 40, anchor: "end" })
    : "";

  const innerOrPlaceholder = innerSvg ?? placeholderInner();

  const footerLeft = escapeXml(canonicalUrl ?? "scoracle.com");
  const footerRightSafe = escapeXml(footerRight ?? "");

  const numerals = cornerLabel ? composeNumerals(escapeXml(cornerLabel)) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#EAE5DD"/>
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" fill="#F4F1EB" rx="6" ry="6"/>
  <svg x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 100 100"
       preserveAspectRatio="none" fill="none" stroke="#9C9890" stroke-width="0.9"
       stroke-linecap="round" stroke-linejoin="round">${frameInnerSvg}</svg>
  ${numerals}
  ${primaryHeader}
  ${comparedHeader}
  <line x1="${CARD_X + 60}" y1="320" x2="${CARD_X + CARD_W - 60}" y2="320"
        stroke="#9C9890" stroke-width="0.5" stroke-opacity="0.5"/>
  <g transform="translate(${BODY_X}, ${BODY_Y})">${innerOrPlaceholder}</g>
  <line x1="${CARD_X + 60}" y1="1200" x2="${CARD_X + CARD_W - 60}" y2="1200"
        stroke="#9C9890" stroke-width="0.5" stroke-opacity="0.5"/>
  <text x="${CARD_X + 60}" y="1255" font-family="PT Serif"
        font-size="22" fill="#5C5853">${footerLeft}</text>
  <text x="${CARD_X + CARD_W - 60}" y="1255" font-family="PT Serif" font-style="italic"
        font-size="22" fill="#9C9890" text-anchor="end">${footerRightSafe}</text>
</svg>`;
}

function composeHeader(
  entity: CardEntityFacts,
  pos: { x: number; anchor: "start" | "end" },
): string {
  const name = escapeXml(entity.name);
  const subtitle = escapeXml(entity.subtitle);
  const hasImage = !!entity.imageDataUri;

  // For start-anchored (left), the image sits at x, text starts to the
  // right of the image. For end-anchored (right), the image sits at x
  // (right edge), text ends to the LEFT of the image.
  const imgSize = 100;
  const imgY = 100;
  const textOffsetFromImg = 24;

  let imageEl = "";
  let textX: number;
  if (pos.anchor === "start") {
    imageEl = hasImage
      ? `<image href="${entity.imageDataUri}" x="${pos.x}" y="${imgY}" width="${imgSize}" height="${imgSize}" preserveAspectRatio="xMidYMid meet"/>`
      : "";
    textX = pos.x + (hasImage ? imgSize + textOffsetFromImg : 0);
  } else {
    imageEl = hasImage
      ? `<image href="${entity.imageDataUri}" x="${pos.x - imgSize}" y="${imgY}" width="${imgSize}" height="${imgSize}" preserveAspectRatio="xMidYMid meet"/>`
      : "";
    textX = pos.x - (hasImage ? imgSize + textOffsetFromImg : 0);
  }

  return `${imageEl}
  <text x="${textX}" y="${imgY + 42}" font-family="PT Serif"
        font-size="36" fill="#171717" text-anchor="${pos.anchor}">${name}</text>
  <text x="${textX}" y="${imgY + 78}" font-family="PT Serif" font-style="italic"
        font-size="22" fill="#5C5853" text-anchor="${pos.anchor}">${subtitle}</text>`;
}

function composeNumerals(label: string): string {
  // Match the in-app card's corner numeral treatment: italic, tertiary
  // gray, TL upright + BR rotated 180°. Insets are larger than the in-app
  // card (8/14 px) because the card frame is 6× bigger here.
  const tlX = CARD_X + 24;
  const tlY = CARD_Y + 42;
  const brX = CARD_X + CARD_W - 24;
  const brY = CARD_Y + CARD_H - 24;
  return `<text x="${tlX}" y="${tlY}" font-family="PT Serif" font-style="italic"
        font-size="26" fill="#9C9890">${label}</text>
  <text x="${brX}" y="${brY}" font-family="PT Serif" font-style="italic"
        font-size="26" fill="#9C9890" text-anchor="end"
        transform="rotate(180, ${brX}, ${brY})">${label}</text>`;
}

function placeholderInner(): string {
  // Render-safe fallback when a Card hasn't supplied innerSvg yet.
  // Centered in the 800×800 body area.
  return `<text x="${BODY_W / 2}" y="${BODY_H / 2}" font-family="PT Serif" font-style="italic"
        font-size="32" fill="#9C9890" text-anchor="middle">Scoracle</text>`;
}

export const CARD_BODY_AREA = { w: BODY_W, h: BODY_H } as const;
