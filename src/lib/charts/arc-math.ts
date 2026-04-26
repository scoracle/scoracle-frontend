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
