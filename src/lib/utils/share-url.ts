/**
 * share-url — canonical-URL builder for shareable Cards.
 *
 * Every share path on the platform routes through this helper so the
 * URL shape stays consistent — sport upper-cased, type lower-case,
 * optional `tab=` hint that the profile route reads on init to land
 * recipients on the same Card the sender shared. Every shareable Card
 * shares the same builder.
 */
import type { ProfileTab } from "../../contexts/profile";

export type ShareTab = ProfileTab;

const SHARE_TABS = new Set<string>(["stats", "rating", "news", "momentum", "sigil", "roster"]);

export function isShareTab(tab: string): tab is ShareTab {
  return SHARE_TABS.has(tab);
}

export interface ShareEntity {
  /** Sport identifier — accepts any casing; helper upper-cases it. */
  sport: string;
  /** Entity discriminator. */
  type: "player" | "team";
  /** Entity id (string-coerced). */
  id: string;
}

const FALLBACK_ORIGIN = "https://scoracle.com";

/**
 * Build the canonical profile URL for an entity, with an optional
 * `tab=` hint. On the server (no `window`), falls back to the
 * production origin so the absolute URL is safe to embed in OG tags
 * or paste into a clipboard.
 */
export function buildShareUrl(
  entity: ShareEntity,
  tab?: ShareTab,
  /** Extra view state (rate / scope / vs) preserved so the recipient + OG crawler
   *  land on the same per-X mode / cohort scope / comparison. */
  extra?: Record<string, string>,
): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : FALLBACK_ORIGIN;

  const params = new URLSearchParams({
    sport: entity.sport.toUpperCase(),
    type: entity.type,
    id: String(entity.id),
  });
  if (tab) params.set("tab", tab);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
  }

  return `${origin}/profile?${params.toString()}`;
}
