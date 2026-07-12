/**
 * Arc Math — Pure geometry for pizza/radar charts
 *
 * Extracted from pizza-chart.ts for reuse by the Solid PizzaChart component.
 * No DOM dependencies — these are pure functions.
 */

/**
 * Convert polar coordinates to cartesian.
 */
export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInRadians: number,
): { x: number; y: number } {
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Generate an SVG arc path string for a radial slice.
 *
 * Returns a closed path from outerStart → outerEnd → innerEnd → innerStart.
 */
export function describeArc(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  padAngle: number = 0,
): string {
  const adjustedStart = startAngle + padAngle / 2;
  const adjustedEnd = endAngle - padAngle / 2;

  const outerStart = polarToCartesian(centerX, centerY, outerRadius, adjustedStart);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, adjustedEnd);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, adjustedStart);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, adjustedEnd);

  const largeArcFlag = adjustedEnd - adjustedStart > Math.PI ? 1 : 0;

  return [
    'M', outerStart.x, outerStart.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
    'L', innerEnd.x, innerEnd.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
    'Z',
  ].join(' ');
}

/**
 * Generate an SVG path for the curved outer edge of a slice — just the arc,
 * no inner edge, not closed. Used for rendering a "marker line" through
 * another slice (e.g., where a comparison value would land).
 */
export function describeArcOnly(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  padAngle: number = 0,
): string {
  const adjustedStart = startAngle + padAngle / 2;
  const adjustedEnd = endAngle - padAngle / 2;

  const start = polarToCartesian(centerX, centerY, radius, adjustedStart);
  const end = polarToCartesian(centerX, centerY, radius, adjustedEnd);
  const largeArcFlag = adjustedEnd - adjustedStart > Math.PI ? 1 : 0;

  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y].join(' ');
}

/**
 * Calculate the radius of a slice based on its percentile value.
 */
export function sliceRadius(
  percentile: number,
  innerRadius: number,
  outerRadius: number,
): number {
  const clamped = Math.max(0, Math.min(100, percentile));
  return innerRadius + ((outerRadius - innerRadius) * clamped) / 100;
}

/**
 * Get the CSS custom property name for a percentile tier.
 *
 * Returns a variable name like `--percentile-elite` that maps to the
 * tier colors defined in global.css.
 */
export function percentileTierVar(percentile: number): string {
  if (percentile >= 90) return 'var(--percentile-elite, #16a34a)';
  if (percentile >= 75) return 'var(--percentile-above, #2563eb)';
  if (percentile >= 50) return 'var(--percentile-average, #d97706)';
  if (percentile >= 25) return 'var(--percentile-below, #ea580c)';
  return 'var(--percentile-poor, #dc2626)';
}

/**
 * Determine text-anchor for a label based on its x position.
 */
export function textAnchor(x: number): 'start' | 'middle' | 'end' {
  if (x > 10) return 'start';
  if (x < -10) return 'end';
  return 'middle';
}

// ─── Outer-label layout ─────────────────────────────────────────────────────
// Shared by PizzaChart and ButterflyChart: near-horizontal labels are what
// force the viewBox wider and shrink the rendered disk, so the widest label
// blocks are steered to the most-vertical slots and the viewBox margin is
// computed from what actually remains at the sides.

// Estimated glyph widths in viewBox units for the charts' outer label block
// (10px UI-font label line over a 9px numeric value line, ~0.52em per glyph).
const LABEL_CHAR_W = 5.2;
const VALUE_CHAR_W = 4.7;
// Breathing room past the widest label: covers the hover font step and the
// few px the per-glyph estimate can undershoot on wide glyphs.
const LABEL_MARGIN_PAD = 12;

/**
 * Estimated width of a slice's outer label block — the wider of its label
 * line and its value line(s).
 */
export function labelBlockWidth(
  label: string,
  ...values: Array<string | number | null | undefined>
): number {
  const valueW = values.reduce<number>(
    (max, v) => Math.max(max, String(v ?? '—').length * VALUE_CHAR_W),
    0,
  );
  return Math.max(label.length * LABEL_CHAR_W, valueW);
}

/**
 * Mid-angles for `count` slices spread across `sweep` radians, starting at
 * 12 o'clock. The full pizza passes 2π; a butterfly half passes π (the left
 * half mirrors, so its horizontal extents are identical).
 */
export function sliceMidAngles(count: number, sweep: number): number[] {
  const step = sweep / count;
  return Array.from({ length: count }, (_, i) => -Math.PI / 2 + (i + 0.5) * step);
}

/**
 * Reorder items so the widest label blocks land on the most-vertical slots
 * (12/6 o'clock, where text stacks in open vertical room) and the narrowest
 * on the most-horizontal (3/9 o'clock, where text costs viewBox width).
 * Ties keep their incoming order on both sides of the assignment.
 */
export function placeWideLabelsVertical<T>(
  items: T[],
  midAngles: number[],
  widthOf: (item: T) => number,
): T[] {
  const slots = midAngles
    .map((angle, i) => ({ i, horizontal: Math.abs(Math.cos(angle)) }))
    .sort((a, b) => a.horizontal - b.horizontal);
  const wideFirst = items
    .map((item, i) => ({ item, w: widthOf(item), i }))
    .sort((a, b) => b.w - a.w || a.i - b.i);
  const placed = new Array<T>(items.length);
  slots.forEach((slot, j) => {
    placed[slot.i] = wideFirst[j].item;
  });
  return placed;
}

/**
 * The horizontal viewBox margin (per side, past `halfWidth`) the placed
 * labels need so none crop. Each label anchors at `labelRadius` along its
 * mid-angle; near-horizontal labels extend outward by their full block
 * width, centered ones by half (mirrors the textAnchor() rule).
 */
export function requiredLabelMargin<T>(
  placed: T[],
  midAngles: number[],
  widthOf: (item: T) => number,
  labelRadius: number,
  halfWidth: number,
): number {
  let maxExtent = 0;
  placed.forEach((item, i) => {
    const x = Math.cos(midAngles[i]) * labelRadius;
    const w = widthOf(item);
    const extent = Math.abs(x) + (Math.abs(x) > 10 ? w : w / 2);
    if (extent > maxExtent) maxExtent = extent;
  });
  return Math.max(0, Math.ceil(maxExtent + LABEL_MARGIN_PAD - halfWidth));
}
