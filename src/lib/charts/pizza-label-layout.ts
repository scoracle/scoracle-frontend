import { sliceRadius } from "./arc-math";

/** Names move only 40% as far as the slice. A tiny slice gains breathing
 * room outside the center; a full slice keeps the normal close tip gap.
 * Shared by the fit solver and SVG so label extents cannot disagree. */
export function pizzaLabelRadius(percentile: number, inner: number, outer: number, gap: number) {
  const tip = sliceRadius(percentile, inner, outer);
  return tip + gap + (outer - tip) * 0.6;
}
