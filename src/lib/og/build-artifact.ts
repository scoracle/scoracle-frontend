/**
 * Compose the full OG image SVG: header band + framed card area + footer band.
 *
 * The dispatcher pattern: the caller (`src/routes/og/...`) resolves the
 * per-Card-type inner content (a `<g>` group string) by fetching data and
 * calling the right Card's exported SVG renderer (e.g., `vibeArtifactSvg`
 * from VibeCard.tsx). It also fetches entity facts + the weathered tarot
 * border SVG asset + (optional) the entity image as a base64 data URI,
 * then hands everything here for composition.
 *
 * Output dimensions: 1200×630 — the OG standard for X / Facebook /
 * iMessage previews. Aspect ratio ≈ 1.91:1.
 *
 * Layout (3 bands):
 *
 *   ┌──────────────────────────────────────────────────────────┐  y=  0
 *   │  HEADER BAND (110 px)                                     │
 *   │   [logo 70×70]  Entity Name                               │
 *   │                 Context · SPORT                           │
 *   ├──────────────────────────────────────────────────────────┤  y=110
 *   │             CARD AREA  (700×405 at x=250)                 │
 *   │             ┌────────────────────────────────┐            │
 *   │             │ weathered tarot frame          │            │
 *   │             │   + innerSvg                   │            │
 *   │             └────────────────────────────────┘            │
 *   ├──────────────────────────────────────────────────────────┤  y=540
 *   │  FOOTER BAND (90 px)                                       │
 *   │   scoracle.com/...                              May 15     │
 *   └──────────────────────────────────────────────────────────┘  y=630
 *
 * Palette (from `@scoracle/tokens@0.4.0`, hex-literal because resvg
 * doesn't resolve CSS custom properties):
 *   --bg              #EAE5DD   page surface
 *   --bg-card         #F4F1EB   card surface
 *   --text            #171717
 *   --text-secondary  #5C5853
 *   --text-tertiary   #9C9890
 */
import { escapeXml } from "./escape-xml";

const W = 1200;
const H = 630;
const CARD_X = 250;
const CARD_Y = 120;
const CARD_W = 700;
const CARD_H = 405;

export interface ArtifactEntityFacts {
  name: string;
  /** Pre-fetched base64 data URI of the entity image (logo / photo). When
   *  null, the header band renders name + context without an image. */
  imageDataUri: string | null;
  context: string;
}

export interface ArtifactInput {
  cardType: string;
  sport: string;
  type: string;
  id: string;
  /** Card-area inner SVG content (`<g>...</g>`) — coords are RELATIVE to a
   *  700×405 box at origin (0,0). Caller's Card renderer produces this. */
  innerSvg?: string;
  /** Inner contents of `public/chrome/weathered-tarot-border.svg` (between
   *  the outer `<svg>` tags). Caller loads via `loadFrameInner`. */
  frameInnerSvg: string;
  /** When supplied, header band renders entity image (if data URI set),
   *  name, and context. When null, header band is empty whitespace. */
  entity?: ArtifactEntityFacts | null;
  /** Footer-band line: canonical share URL. Falls back to "scoracle.com". */
  canonicalUrl?: string;
  /** Footer-band date (right-aligned). ISO string or formatted text. */
  date?: string;
}

export function buildArtifactSvg(input: ArtifactInput): string {
  const { cardType, sport, type, id, innerSvg, frameInnerSvg, entity, canonicalUrl, date } = input;

  const header = entity ? composeHeader(entity) : "";
  const innerOrPlaceholder = innerSvg ?? placeholderInner(cardType, sport, type, id);
  const footerUrl = escapeXml(canonicalUrl ?? "scoracle.com");
  const footerDate = escapeXml(date ?? "");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#EAE5DD"/>
  ${header}
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" fill="#F4F1EB"/>
  <svg x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 100 100"
       preserveAspectRatio="none" fill="none" stroke="#9C9890" stroke-width="0.9"
       stroke-linecap="round" stroke-linejoin="round">${frameInnerSvg}</svg>
  <g transform="translate(${CARD_X}, ${CARD_Y})">${innerOrPlaceholder}</g>
  <text x="80" y="585" font-family="PT Serif" font-style="italic"
        font-size="18" fill="#5C5853">${footerUrl}</text>
  <text x="${W - 80}" y="585" font-family="PT Serif" font-style="italic"
        font-size="18" fill="#9C9890" text-anchor="end">${footerDate}</text>
</svg>`;
}

function composeHeader(entity: ArtifactEntityFacts): string {
  const name = escapeXml(entity.name);
  const context = escapeXml(entity.context);
  const hasImage = !!entity.imageDataUri;
  const textX = hasImage ? 170 : 80;
  const image = hasImage
    ? `<image href="${entity.imageDataUri}" x="80" y="22" width="70" height="70" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  return `${image}
  <text x="${textX}" y="58" font-family="PT Serif"
        font-size="36" fill="#171717">${name}</text>
  <text x="${textX}" y="88" font-family="PT Serif" font-style="italic"
        font-size="22" fill="#5C5853">${context}</text>`;
}

function placeholderInner(
  cardType: string,
  sport: string,
  type: string,
  id: string,
): string {
  const heading = escapeXml(`Scoracle ${cardType}`);
  const subtitle = escapeXml(`${sport} · ${type} · ${id}`);
  return `<text x="${CARD_W / 2}" y="${CARD_H / 2 - 12}" font-family="PT Serif"
        font-size="44" fill="#171717" text-anchor="middle">${heading}</text>
  <text x="${CARD_W / 2}" y="${CARD_H / 2 + 32}" font-family="PT Serif" font-style="italic"
        font-size="24" fill="#5C5853" text-anchor="middle">${subtitle}</text>`;
}
