/**
 * news-display — client-safe display constants for the news surfaces.
 *
 * Pure data + pure functions (no component imports) so these can be shared
 * between the profile cards (NarrativesCard, TransferRow) and the standalone
 * /leaderboard boards without either re-declaring them. News lives on several
 * surfaces; the labels and source-attribution phrasing must read identically
 * on all of them.
 */
import type { NewsScope } from "../../contexts/profile";

/** Historical scopes shared by Narratives and Transfers/Trades. Values map
 *  directly to the backend `scope=` query parameter. */
export const NEWS_SCOPE_OPTIONS: ReadonlyArray<{ value: NewsScope; label: string }> = [
  { value: "current_week", label: "Current" },
  { value: "last_week", label: "Last week" },
  { value: "two_weeks_ago", label: "2 weeks" },
  { value: "three_weeks_ago", label: "3 weeks" },
  { value: "last_month", label: "Month" },
];

const TRAJECTORY_LABELS: Record<string, string> = {
  developing_story: "Developing story",
  heating_up: "Heating up",
  cooling_off: "Cooling off",
};

/** Resolve a news trajectory to its display label. A served `label` wins; the
 * trajectory key otherwise maps to a fixed phrase; unknown/missing → null. */
export function newsTrajectoryLabel(
  trajectory?: string | null,
  label?: string | null,
): string | null {
  return label ?? (trajectory ? TRAJECTORY_LABELS[trajectory] ?? null : null);
}

/** "N sources · A, B" — one phrasing for the source line wherever news shows.
 *  Null when both the count and the name list are empty. */
export function sourceAttribution(
  sourceCount?: number | null,
  sourceNames?: readonly string[] | null,
): string | null {
  const count = sourceCount ?? 0;
  const names = sourceNames ?? [];
  if (count <= 0 && names.length === 0) return null;
  const countLabel = count > 0 ? `${count} ${count === 1 ? "source" : "sources"}` : null;
  const shownNames = names.slice(0, 2).join(", ");
  return [countLabel, shownNames].filter(Boolean).join(" · ");
}
