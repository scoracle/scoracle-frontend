/**
 * build-orb-mask — cut the crystal ball's INTERIOR out of the hero art.
 *
 * The orb's glass (CrystalBall.css `.crystal-glass`) and ornament cutout
 * both follow the exact region inside the drawn ring, and the ring is
 * hand-drawn — no circle fits it without either escaping the line or leaving
 * a sliver of desk. So the mask comes from the asset: flood-fill the
 * transparent interior from the ball's centre (the opaque ring is the
 * barrier), then grow into the small enclosed shapes it touches — the sparkle
 * and sliver strokes and the clear inside them — and nothing else: where a
 * finger is drawn over the glass, its interior and nail reach outside the
 * ball and stay out of the mask.
 *
 * Output: public/images/orb-glass-mask-N.png — white where glass, transparent
 * elsewhere, at half the hero's resolution (the mask is used as a
 * luminance/alpha mask stretched to the art box, so half-res is plenty).
 *
 *   node scripts/build-orb-mask.mjs
 *
 * Also writes overlapping cutout/fill masks for the scanned rim and a
 * silhouette mask for the neutral underpainting beneath the hands and base.
 * All masks share the original art coordinates.
 */
import sharp from "sharp";

const SRC = "public/images/scoracle_crystal_ball.png";
// Bump the -N when the mask changes: the edge cache (and a dev browser) keys
// on pathname, so a regenerated mask must take a new name.
const OUT = "public/images/orb-glass-mask-2.png";
const GLASS_CUTOUT_OUT = "public/images/orb-glass-cutout-mask-3.png";
const GLASS_FILL_OUT = "public/images/orb-glass-fill-mask-3.png";
const SILHOUETTE_OUT = "public/images/orb-silhouette-mask-1.png";
// Ball centre, measured off the asset (see CrystalBall.css).
const CX = 628;
const CY = 729;
const INK = 100; // alpha above this is line

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const isInk = (x, y) => data[(y * W + x) * 4 + 3] > INK;

// Label every 4-connected component of the art — ink components and clear
// components alike. The ball's interior is the clear component under the
// centre; the ring, hands and cup are one big ink component (the fingers
// touch the ring); the sparkles and slivers inside the glass are small ink
// components of their own, each enclosing a small clear one.
const label = new Int32Array(W * H).fill(-1);
const comps = []; // { ink, size, inside, touchesBorder, neighbours:Set }
const R2 = 415 * 415; // "inside the ball" — generous; the ring is at ~390
for (let start = 0; start < W * H; start++) {
  if (label[start] >= 0) continue;
  const id = comps.length;
  const sx = start % W;
  const sy = (start - sx) / W;
  const ink = isInk(sx, sy);
  const comp = { ink, size: 0, inside: true, touchesBorder: false, neighbours: new Set() };
  comps.push(comp);
  const stack = [start];
  label[start] = id;
  while (stack.length) {
    const idx = stack.pop();
    const x = idx % W;
    const y = (idx - x) / W;
    comp.size++;
    if ((x - CX) ** 2 + (y - CY) ** 2 > R2) comp.inside = false;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) comp.touchesBorder = true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (label[n] >= 0) {
        if (label[n] !== id) { comp.neighbours.add(label[n]); comps[label[n]].neighbours.add(id); }
        continue;
      }
      if (isInk(nx, ny) !== ink) continue;
      label[n] = id;
      stack.push(n);
    }
  }
}

// Grow from the interior into every neighbouring component that lies wholly
// inside the ball: the sparkle strokes, then the clear inside them. The big
// ink component (ring + hands) and a finger's interior both reach outside
// the ball, so neither is taken — which is what keeps a fingertip drawn
// over the glass, nail and all, in its own ink.
const interior = label[CY * W + CX];
const take = new Uint8Array(comps.length);
const queue = [interior];
take[interior] = 1;
while (queue.length) {
  const id = queue.shift();
  for (const n of comps[id].neighbours) {
    if (take[n] || !comps[n].inside || comps[n].touchesBorder) continue;
    take[n] = 1;
    queue.push(n);
  }
}
const mask = Buffer.alloc(W * H, 0);
let minY = H, maxY = 0, minX = W, maxX = 0, taken = 0;
for (let i = 0; i < W * H; i++) {
  if (!take[label[i]]) continue;
  mask[i] = 255;
  const x = i % W, y = (i - x) / W;
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
}
for (let i = 0; i < comps.length; i++) if (take[i]) taken++;
console.log(`took ${taken} of ${comps.length} components; bounds x ${minX}–${maxX}, y ${minY}–${maxY} (centre ${(minX + maxX) / 2}, ${(minY + maxY) / 2})`);

// Write as RGBA: white with the mask as alpha (works as an alpha mask in
// every engine that supports mask-image).
async function writeMask(alpha, destination) {
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = alpha[i];
  }
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .resize(Math.round(W / 2), Math.round(H / 2))
    .png({ compressionLevel: 9 })
    .toFile(destination);
  console.log("wrote", destination);
}

await writeMask(mask, OUT);

// Bleed beneath the rim, including the scan's opaque pale matte pixels.
// Sharp erodes the black background, expanding this white alpha region.
const glassFill = await sharp(mask, { raw: { width: W, height: H, channels: 1 } })
  .erode(5)
  .extractChannel(0)
  .raw()
  .toBuffer();

// Move the cutout past the scan's light fringe into solid ink. The wider
// black underfill overlaps it, so resampling cannot reopen a pale seam.
// This narrow band follows the actual drawing, including the fingertip.
const glassCutout = await sharp(mask, { raw: { width: W, height: H, channels: 1 } })
  .erode(3)
  .extractChannel(0)
  .raw()
  .toBuffer();
await writeMask(glassCutout, GLASS_CUTOUT_OUT);

// Seal the drawing's enclosed regions, leaving exterior negative space clear.
// A desk-colored underpainting keeps the backdrop out of the hands and base.
const silhouette = Buffer.alloc(W * H, 0);
for (let i = 0; i < W * H; i++) {
  const component = comps[label[i]];
  if (component.ink || !component.touchesBorder) silhouette[i] = 255;
}
for (let i = 0; i < W * H; i++) glassFill[i] = Math.min(glassFill[i], silhouette[i]);
await writeMask(glassFill, GLASS_FILL_OUT);
await writeMask(silhouette, SILHOUETTE_OUT);
