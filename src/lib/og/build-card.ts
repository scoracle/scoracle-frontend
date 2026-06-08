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
  /** Pre-fetched team-crest data URI — drawn as a small badge on the
   *  bottom-right of a player's circular photo. Null/omitted → no badge. */
  crestDataUri?: string | null;
  /** Circle-mask the main image (player headshots). Team logos stay
   *  contained (their silhouette is the identity), so this is false there. */
  round?: boolean;
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
  /** Primary entity meta — centered header block (photo / name / subtitle). */
  primary?: CardEntityFacts | null;
  /** Compared entity (compare cards only). When set, the header splits into two:
   *  primary top-left, compared top-right (each photo / name / subtitle). */
  compared?: CardEntityFacts | null;
  /** Corner numeral — the entity id (or a per-card mark, e.g. the vibe
   *  archetype numeral). Drawn at TL and BR (rotated 180°). Optional. */
  cornerLabel?: string;
}

export function buildCardSvg(input: BuildCardInput): string {
  const { innerSvg, frameInnerSvg, primary, compared, cornerLabel } = input;

  const header = primary && compared
    ? composeDualHeader(primary, compared)
    : primary
      ? composeCenteredHeader(primary)
      : "";

  const innerOrPlaceholder = innerSvg ?? placeholderInner();

  const numerals = cornerLabel ? composeNumerals(escapeXml(cornerLabel)) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#EAE5DD"/>
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" fill="#F4F1EB" rx="6" ry="6"/>
  <svg x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 100 100"
       preserveAspectRatio="none" fill="none" stroke="#9C9890" stroke-width="0.9"
       stroke-linecap="round" stroke-linejoin="round">${frameInnerSvg}</svg>
  ${numerals}
  ${header}
  <g transform="translate(${BODY_X}, ${BODY_Y})">${innerOrPlaceholder}</g>
</svg>`;
}

// Centered entity header — photo / name / uppercase subtitle, mirroring the
// in-app EntityMeta widget (`.pw-content` is a centered column: logo → name →
// caps subtitle). The portrait sits up top, name + team centered below.
function composeCenteredHeader(entity: CardEntityFacts): string {
  const name = escapeXml(entity.name);
  const subtitle = escapeXml((entity.subtitle ?? "").toUpperCase());
  const hasImage = !!entity.imageDataUri;
  const cx = W / 2;

  const imgSize = 130;
  const imgTop = 60;
  const r = imgSize / 2;
  const ccx = cx;
  const ccy = imgTop + r;

  let image = "";
  if (hasImage && entity.round) {
    // Circular headshot: clip to a circle (slice = fill, crop edges) + a thin
    // ring. A team-crest badge sits at the lower-right, overlapping the rim.
    const crest = entity.crestDataUri
      ? (() => {
          const br = 30; // badge radius
          const off = r * 0.72; // place along the lower-right diagonal
          const bx = ccx + off * 0.707;
          const by = ccy + off * 0.707;
          const cs = br * 1.32; // crest image box (inset within the badge)
          return `<circle cx="${bx}" cy="${by}" r="${br}" fill="#F4F1EB" stroke="#9C9890" stroke-width="1"/>
  <image href="${entity.crestDataUri}" x="${bx - cs / 2}" y="${by - cs / 2}" width="${cs}" height="${cs}" preserveAspectRatio="xMidYMid meet"/>`;
        })()
      : "";
    image = `<defs><clipPath id="og-photo-clip"><circle cx="${ccx}" cy="${ccy}" r="${r}"/></clipPath></defs>
  <image href="${entity.imageDataUri}" x="${cx - r}" y="${imgTop}" width="${imgSize}" height="${imgSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#og-photo-clip)"/>
  <circle cx="${ccx}" cy="${ccy}" r="${r}" fill="none" stroke="#9C9890" stroke-width="1.5"/>
  ${crest}`;
  } else if (hasImage) {
    // Team logo / fallback crest — contained, no circle mask (preserve shape).
    image = `<image href="${entity.imageDataUri}" x="${cx - r}" y="${imgTop}" width="${imgSize}" height="${imgSize}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const nameY = hasImage ? imgTop + imgSize + 56 : 150;
  const subtitleY = nameY + 40;

  return `${image}
  <text x="${cx}" y="${nameY}" font-family="PT Serif" font-size="52"
        fill="#171717" text-anchor="middle">${name}</text>
  ${
    subtitle
      ? `<text x="${cx}" y="${subtitleY}" font-family="PT Serif" font-size="22"
        fill="#5C5853" text-anchor="middle" letter-spacing="3">${subtitle}</text>`
      : ""
  }`;
}

// Dual header (compare cards): the primary entity top-left, the compared entity
// top-right — each a photo + name + caps subtitle, mirroring the in-app compare's
// left/right layout so the butterfly body below gets the room.
function composeDualHeader(primary: CardEntityFacts, compared: CardEntityFacts): string {
  return composeHeaderSide(primary, "left") + composeHeaderSide(compared, "right");
}

function composeHeaderSide(entity: CardEntityFacts, side: "left" | "right"): string {
  const name = escapeXml(entity.name);
  const subtitle = escapeXml((entity.subtitle ?? "").toUpperCase());
  const hasImage = !!entity.imageDataUri;

  const imgSize = 96;
  const imgTop = 64;
  const r = imgSize / 2;
  const edge = side === "left" ? CARD_X + 34 : W - CARD_X - 34; // 84 / 916
  const anchor = side === "left" ? "start" : "end";
  const imgX = side === "left" ? edge : edge - imgSize;
  const ccx = imgX + r;
  const ccy = imgTop + r;

  let image = "";
  if (hasImage && entity.round) {
    const clipId = `dh-clip-${side}`;
    image = `<defs><clipPath id="${clipId}"><circle cx="${ccx}" cy="${ccy}" r="${r}"/></clipPath></defs>
  <image href="${entity.imageDataUri}" x="${imgX}" y="${imgTop}" width="${imgSize}" height="${imgSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>
  <circle cx="${ccx}" cy="${ccy}" r="${r}" fill="none" stroke="#9C9890" stroke-width="1.5"/>`;
  } else if (hasImage) {
    image = `<image href="${entity.imageDataUri}" x="${imgX}" y="${imgTop}" width="${imgSize}" height="${imgSize}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const nameY = imgTop + imgSize + 40;
  const subY = nameY + 30;
  return `${image}
  <text x="${edge}" y="${nameY}" font-family="PT Serif" font-size="34" fill="#171717" text-anchor="${anchor}">${name}</text>
  ${
    subtitle
      ? `<text x="${edge}" y="${subY}" font-family="PT Serif" font-size="17" fill="#5C5853" text-anchor="${anchor}" letter-spacing="2">${subtitle}</text>`
      : ""
  }`;
}

function composeNumerals(label: string): string {
  // Match the in-app card's corner numeral treatment: italic, tertiary gray,
  // TL upright + BR rotated 180°. Insets are larger than the in-app card
  // (8/14 px) because the card frame is 6× bigger here.
  //
  // The BR mark is the SAME start-anchored text as the TL, rotated 180° about
  // the CARD CENTER — a point-reflection through the middle. This lands it at a
  // perfectly symmetric inset in the opposite corner for any label width. (The
  // old approach rotated an end-anchored text about its own anchor, which pushed
  // the glyphs past the frame's right/bottom edges.)
  const tlX = CARD_X + 24;
  const tlY = CARD_Y + 42;
  const cx = CARD_X + CARD_W / 2;
  const cy = CARD_Y + CARD_H / 2;
  return `<text x="${tlX}" y="${tlY}" font-family="PT Serif" font-style="italic"
        font-size="26" fill="#9C9890">${label}</text>
  <text x="${tlX}" y="${tlY}" font-family="PT Serif" font-style="italic"
        font-size="26" fill="#9C9890"
        transform="rotate(180, ${cx}, ${cy})">${label}</text>`;
}

function placeholderInner(): string {
  // Render-safe fallback when a Card hasn't supplied innerSvg yet.
  // Centered in the 800×800 body area.
  return `<text x="${BODY_W / 2}" y="${BODY_H / 2}" font-family="PT Serif" font-style="italic"
        font-size="32" fill="#9C9890" text-anchor="middle">Scoracle</text>`;
}

export const CARD_BODY_AREA = { w: BODY_W, h: BODY_H } as const;
