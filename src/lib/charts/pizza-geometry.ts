/** Shared CSS-pixel geometry for the pizza and mirrored comparison. */
import { sliceRadius } from './arc-math';
import { pizzaLabelRadius } from './pizza-label-layout';

export interface PizzaChartStat {
  key: string;
  label: string;
  value: number | string;
  percentile: number;
  categoryId?: string;
}

export interface PizzaChartOptions {
  /** Opening box, in CSS px, used until the cell is measured (and on the
   *  server, where there is nothing to measure). The real box is whatever
   *  the chart cell turns out to be. */
  width?: number;
  height?: number;
  innerRadius?: number;
  /** Hard ceiling on the disk radius. Omit to let the disk take the box. */
  outerRadius?: number;
  /** Minimum tip gap. Low slices receive additional outward label space. */
  labelOffset?: number;
}

export const PAD_ANGLE = 0.02;

// Type sizes are CSS PIXELS now (see the header): what these say is what the
// reader gets, on a peeked card and a lifted one alike. Mirrored in
// PizzaChart.css so the DOM and the layout solver agree.
const LABEL_FONT = 13;
const VALUE_FONT = 10.5;
// Per-glyph width estimates at those sizes. `--font-ui` is Fraunces — a
// SERIF, not a compact UI sans — so these run wider than a typical estimate,
// and they are deliberately generous: the old layout absorbed estimate error
// in a 12-unit margin pad past the widest label, and the solver has to carry
// that safety itself now (see BOX_PAD). Over-estimating costs a few px of
// radius; under-estimating pushes a name off the cardstock.
const LABEL_CHAR_W = LABEL_FONT * 0.55;
const VALUE_CHAR_W = VALUE_FONT * 0.58;
// Half-height reserved for the outer label block. The solver always reserves
// the TWO-LINE box (name over tally) even for wedges that will end up seating
// their tally inside: it makes `fits()` monotonic in R, and over-reserving
// costs a few px of radius where under-reserving costs a clipped label.
const LABEL_BLOCK_HALF_H = 20;
// Breathing room between the outermost ink and the cell's edge — and the
// slack that absorbs the per-glyph estimate above. Inherits the job the
// retired LABEL_MARGIN_PAD used to do in arc-math's viewBox widening.
const BOX_PAD = 8;

// ─── Dynamic tally type (Scott, 2026-09-07) ─────────────────────────────────
// The tally sizes and seats itself to its wedge: as large as the wedge's
// angular width allows at a rim-anchored seat, between a floor and a cap.
// A wedge too small for even the floor sends its tally back outside under
// the name — nothing is ever hidden, nothing is ever clipped.

const TALLY_FONT_MAX = 15;
const TALLY_FONT_MIN = 8.5;
const TALLY_FONT_STEP = 0.5;
// ~0.62em per glyph in the numeric semibold cut.
const TALLY_CHAR_EM = 0.62;
// The seat hugs the rim: the text's outer edge sits this many units inside
// the wedge's arc, so it never reads as stamped on the boundary nor as
// floating at the wedge's center.
const TALLY_RIM_GAP = 4;
// The tally may span at most this share of the wedge's chord at its seat —
// the rest is breathing room clear of the slice stroke.
const TALLY_CHORD_SHARE = 0.8;

export interface TallyFit {
  /** False → the wedge can't seat the tally; it falls back outside. */
  fits: boolean;
  /** Font size (CSS px) and seat radius for the fitted text. */
  font: number;
  radius: number;
}

/** Fit the tally to one wedge: the largest type (floor→cap) whose width
 *  clears the chord at the rim-anchored seat that type implies. */
export function tallyFit(
  value: number | string,
  percentile: number,
  angleStep: number,
  innerRadius: number,
  outerRadius: number,
): TallyFit {
  const text = String(value);
  const sliceR = sliceRadius(percentile, innerRadius, outerRadius);
  const sweep = angleStep - PAD_ANGLE;
  for (let f = TALLY_FONT_MAX; f >= TALLY_FONT_MIN; f -= TALLY_FONT_STEP) {
    const radius = sliceR - f * 0.75 - TALLY_RIM_GAP;
    if (radius - f * 0.5 <= innerRadius) break; // no radial room for the glyphs
    const chord = 2 * radius * Math.sin(sweep / 2);
    if (text.length * TALLY_CHAR_EM * f <= TALLY_CHORD_SHARE * chord) {
      return { fits: true, font: f, radius };
    }
  }
  return { fits: false, font: TALLY_FONT_MIN, radius: sliceR };
}

// ─── Layout ─────────────────────────────────────────────────────────────────

const valueStr = (v: number | string): string => String(v ?? '—');

/** The widest line of a stat's outer label block. The tally line is counted
 *  whether or not this wedge ends up seating its tally inside — same
 *  monotonicity reason as LABEL_BLOCK_HALF_H, and the tally lines are short
 *  numbers, so the reservation costs almost nothing. */
export const outerBlockWidth = (s: PizzaChartStat): number =>
  Math.max(s.label.length * LABEL_CHAR_W, valueStr(s.value).length * VALUE_CHAR_W);

/**
 * Does a disk of radius R — arcs AND outer labels — fit the half-box?
 * Monotonic in R by construction, which is what lets solveRadius bisect.
 */
function fits(
  stats: PizzaChartStat[],
  mids: number[],
  R: number,
  halfW: number,
  halfH: number,
  innerRadius: number,
  labelOffset: number,
  outwardLabels: boolean,
): boolean {
  // The disk's own bounding circle. Conservative across every sweep, and it
  // is what keeps a 100th-percentile wedge off the cardstock edge.
  if (R > Math.min(halfW, halfH) - BOX_PAD) return false;
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const labelR = pizzaLabelRadius(s.percentile, innerRadius, R, labelOffset);
    const x = Math.cos(mids[i]) * labelR;
    const y = Math.sin(mids[i]) * labelR;
    const w = outerBlockWidth(s);
    // Mirrors textAnchor(): an end-anchored label runs its full width away
    // from the center, a middle-anchored one splits it either side.
    const reach = (outwardLabels || Math.abs(x) > 10) ? w : w / 2;
    if (Math.abs(x) + reach > halfW - BOX_PAD) return false;
    if (Math.abs(y) + LABEL_BLOCK_HALF_H > halfH - BOX_PAD) return false;
  }
  return true;
}

/** The largest radius that still fits the box. Bisection rather than algebra:
 *  the constraints are linear in R but there are two of them per slice plus
 *  the anchor switch, and a 24-step search is both exact enough (sub-pixel)
 *  and impossible to get subtly wrong. */
export function solveRadius(
  stats: PizzaChartStat[],
  mids: number[],
  halfW: number,
  halfH: number,
  innerRadius: number,
  labelOffset: number,
  cap: number | undefined,
  outwardLabels = false,
): number {
  let lo = 0;
  let hi = Math.min(halfW, halfH);
  if (cap != null) hi = Math.min(hi, cap);
  if (!fits(stats, mids, lo, halfW, halfH, innerRadius, labelOffset, outwardLabels)) {
    // The box can't even hold the labels at zero radius (a card squeezed to
    // nothing). Draw something rather than nothing; the cell clips.
    return Math.max(8, hi * 0.5);
  }
  for (let n = 0; n < 24; n++) {
    const mid = (lo + hi) / 2;
    if (fits(stats, mids, mid, halfW, halfH, innerRadius, labelOffset, outwardLabels)) lo = mid;
    else hi = mid;
  }
  return Math.max(8, lo);
}

