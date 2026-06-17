/**
 * sigil-art — illustration registry keyed by rating datapoint label.
 *
 * The Sigil card gives every skill its own illustration. The real
 * (tattoo-style) art lands later; until then every label resolves to a themed
 * monogram placeholder so no slot is ever blank. To ship art for a skill, drop
 * a component into ART keyed by its exact datapoint label (e.g. "Rim Protection",
 * "Goalscoring", "Sacks"). `currentColor` is honored so art inherits the card's
 * tier color.
 */

import type { JSX } from "solid-js";

/** Real illustrations slot in here, keyed by exact datapoint label. */
const ART: Record<string, () => JSX.Element> = {
  // "Rim Protection": () => <RimProtectionArt />,
  // "Goalscoring":    () => <GoalscoringArt />,
};

function placeholderFor(label: string): () => JSX.Element {
  const initial = (label.trim()[0] ?? "?").toUpperCase();
  return () => (
    <svg viewBox="0 0 48 48" class="sigil-art-svg" role="img" aria-label={label}>
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.45" />
      <text
        x="24"
        y="31"
        text-anchor="middle"
        font-family="var(--font-display)"
        font-size="20"
        fill="currentColor"
      >
        {initial}
      </text>
    </svg>
  );
}

/** The illustration for a datapoint label — real art if registered, else a
 *  monogram placeholder. Never returns null. */
export function artFor(label: string): () => JSX.Element {
  return ART[label] ?? placeholderFor(label);
}
