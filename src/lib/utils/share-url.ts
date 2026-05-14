/**
 * share-url — canonical-URL builder for shareable Cards.
 *
 * Every share path on the platform routes through this helper so the
 * URL shape stays consistent — sport upper-cased, type lower-case,
 * optional `tab=` hint that the profile route reads on init to land
 * recipients on the same Card the sender shared. VibeCard, future
 * TraitsCard / CompareCard / StatsCard all share the same builder.
 *
 * The `tab` parameter mirrors `NewsSubTab | StatsSubTab` from
 * `~/contexts/profile.ts` (it has to, because the profile route reads
 * it back into those signals). They're enumerated here as a flat
 * union so consumers don't import context types for a pure URL helper.
 */

export type ShareTab =
  | "news"
  | "x"
  | "vibes"
  | "stats"
  | "traits"
  | "compare";

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
export function buildShareUrl(entity: ShareEntity, tab?: ShareTab): string {
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

  return `${origin}/profile?${params.toString()}`;
}
