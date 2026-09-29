/**
 * build-hero-webp — derive the delivery-format hero art.
 *
 * public/images/scoracle_crystal_ball.png is the CANONICAL art. It is synced
 * from @scoracle/tokens by scripts/sync-token-assets.mjs and it is the source
 * the orb masks are cut from (scripts/build-orb-mask.mjs, whose flood-fill is
 * tuned to this asset's pixel coordinates). Never edit, replace, or delete it.
 *
 * It is also a 361 KB RGBA PNG at 1378x1309, and it is the LCP element on the
 * home page. Shipping PNG to browsers costs ~230 KB of avoidable transfer on
 * every home pageview, so this script derives a WebP twin for delivery only.
 *
 * The PNG stays the build input; the .webp is what index.tsx points at. Same
 * pixel dimensions and a preserved alpha channel, so no layout or mask changes.
 * Every other raster the site serves is already .webp, so this is the outlier.
 *
 *   node scripts/build-hero-webp.mjs
 *
 * Deterministic: quality 90 / alpha 100 for crisp line art at the LCP. Dropping
 * to the q86 used for the drapery backgrounds saves ~15 KB but softens the
 * drawn ring's edges, which are the one thing on this page worth looking at.
 */
import sharp from "sharp";

const SRC = "public/images/scoracle_crystal_ball.png";
const OUT = "public/images/scoracle_crystal_ball.webp";

const src = sharp(SRC);
const before = await src.metadata();
if (!before.hasAlpha) throw new Error(`${SRC} lost its alpha channel — the mask pipeline depends on it.`);

await sharp(SRC).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(OUT);

const after = await sharp(OUT).metadata();
if (after.width !== before.width || after.height !== before.height)
    throw new Error(`${OUT} is ${after.width}x${after.height}, expected ${before.width}x${before.height}.`);
if (!after.hasAlpha) throw new Error(`${OUT} lost its alpha channel.`);

console.log(`${OUT}: ${after.width}x${after.height} alpha, ${before.width === after.width ? "dimensions match" : "DIMENSION DRIFT"}.`);
