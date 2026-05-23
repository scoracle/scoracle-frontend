/**
 * Score-tier color helper.
 *
 * Maps a 0–100 score to one of the 5 percentile-tier CSS variables so
 * every numeric readout on the site (vibe headline, per-category stats
 * average, meta-card aggregates) lands on the same palette.
 *
 * The hex-equivalent variant for SVG-context rendering (OG images)
 * lives in VibeCard.tsx — same thresholds, different palette domain.
 */
export function tierColor(score: number): string {
  if (score >= 81) return "var(--percentile-elite)";
  if (score >= 61) return "var(--percentile-above)";
  if (score >= 41) return "var(--percentile-average)";
  if (score >= 21) return "var(--percentile-below)";
  return "var(--percentile-poor)";
}
