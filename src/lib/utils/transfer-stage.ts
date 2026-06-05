/**
 * transfer-stage — shared display label + heat color for a transfer rumor's
 * Gemma "verdict" stage. Used by the profile Transfers tab (TransfersCard) and
 * the /leaderboard Transfers board so the verdict reads identically on both.
 *
 * Stages run coolest → hottest:
 *   speculation < concrete_interest < advanced_talks < here_we_go
 * mapped onto the site's tier palette (green = hottest, red = coolest), the same
 * green→red language as ratings/vibes.
 */

export const TRANSFER_STAGE_LABEL: Record<string, string> = {
  speculation: "Speculation",
  concrete_interest: "Concrete interest",
  advanced_talks: "Advanced talks",
  here_we_go: "Here we go",
};

// coolest → hottest along the site's standard tier palette (same tokens as
// ratings/vibes, blue "above" tier included — on-brand/consistent per Scott):
//   poor(red) · average(gold) · above(blue) · elite(green).
const TRANSFER_STAGE_COLOR: Record<string, string> = {
  speculation: "var(--percentile-poor)", // coolest → red
  concrete_interest: "var(--percentile-average)", // warming → gold
  advanced_talks: "var(--percentile-above)", // hot → blue
  here_we_go: "var(--percentile-elite)", // hottest → green
};

/** Display label for a stage; null/unknown → "Reported" (no Gemma verdict yet). */
export function transferStageLabel(stage: string | null | undefined): string {
  return TRANSFER_STAGE_LABEL[stage ?? ""] ?? "Reported";
}

/** Heat color for a stage; null/unknown → neutral tertiary (no verdict to tier). */
export function transferStageColor(stage: string | null | undefined): string {
  return TRANSFER_STAGE_COLOR[stage ?? ""] ?? "var(--text-tertiary)";
}
