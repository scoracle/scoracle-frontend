/**
 * Skeleton — platform loading-state primitive.
 *
 * One component for every loading-shape on the site (and across the
 * platform once `@scoracle/ui` is extracted). Three intent-based shape
 * variants — `line`, `circle`, `block` — plus optional `width` / `height`
 * overrides for fine control. A single `pulse` keyframe drives all
 * animations; one `prefers-reduced-motion` rule pauses them all.
 *
 * Usage:
 *   <Skeleton />                                  // default 14 px line
 *   <Skeleton shape="circle" width={64} height={64} />
 *   <Skeleton shape="line" width={180} />
 *   <Skeleton shape="block" height={80} />
 *   <Skeleton class="my-custom-class" />          // escape hatch
 *
 * Aria: marked `aria-hidden="true"` because skeletons are visual-only —
 * screen readers should announce the actual loading state via the
 * surrounding region's role/label, not the skeleton shape itself.
 */

import type { JSX } from "solid-js";
import "./Skeleton.css";

type SkeletonShape = "line" | "circle" | "block";

interface SkeletonProps {
  /** Visual shape variant. Defaults to "line". */
  shape?: SkeletonShape;
  /** Width override. Number → px; string → any CSS dimension. */
  width?: string | number;
  /** Height override. Number → px; string → any CSS dimension. */
  height?: string | number;
  /** Extra class names for one-off shapes / spacing tweaks. */
  class?: string;
  /** Additional inline styles. */
  style?: JSX.CSSProperties;
}

function toCss(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === "number" ? `${v}px` : v;
}

export default function Skeleton(props: SkeletonProps) {
  const shape = () => props.shape ?? "line";
  return (
    <div
      class={`skeleton skeleton-${shape()}${props.class ? ` ${props.class}` : ""}`}
      style={{
        ...(props.style ?? {}),
        width: toCss(props.width),
        height: toCss(props.height),
      }}
      aria-hidden="true"
    />
  );
}
