/**
 * scarcity — copy tiered on a peak skill's cross-entity standing (0-100).
 *
 * Shared by the in-app Rating card and the OG rating body so the share
 * artifact's scarcity line reads identically to the live card.
 */
export function scarcity(rank: number): string {
  if (rank >= 99) return "the single most valuable skill in the sport";
  if (rank >= 95) return "a top-5% skill in the sport";
  if (rank >= 90) return "an elite, rare skill";
  if (rank >= 75) return "a standout strength";
  return "their defining skill";
}
