/**
 * card-meta — the Card identity + share SSOT.
 *
 * Pure data, ZERO component imports — safe to pull into the `<Card>` component,
 * the share-text builder, AND the server OG handler alike. One `CardId`
 * taxonomy across the whole pillar; the in-app wiring (body / fallback /
 * preload) lives in `card-registry.tsx`, the OG bodies in `lib/cards/og-bodies.ts`,
 * both keyed by the same `CardId`.
 *
 * See ~/scoracleWiki/wiki/Architecture/Card Pillar.md.
 */
import type { ProfileTab } from "../../contexts/profile";
import type { EntityType } from "../types";

/** Every card id == its `?tab=` value == its OG `:cardType` == its `ShareTab`. */
export type CardId = ProfileTab;

/**
 * Client-facing pillar label, entity-type aware (the superhero framing):
 *   - players: composite → "General", specialist → "Special", vibe → "Vibe"
 *   - teams:   composite → "Rating",  vibe → "Vibe"  (no specialist — there are
 *     no specialist teams; the pillar is player-only)
 * Returns null for non-pillar cards (they use the registry's static label) and
 * for specialist on teams (the cell/tab is dropped). The single source for these
 * labels across the nav, the cards, the meta widget, and the OG headings.
 */
export function pillarLabel(cardId: CardId, type: EntityType): string | null {
  switch (cardId) {
    case "composite":
      return type === "team" ? "Rating" : "General";
    case "specialist":
      return type === "team" ? null : "Special";
    case "vibes":
      return "Vibe";
    default:
      return null;
  }
}

/** Canvas = chart/illustration (shares its own body); ledger = list/feed. */
export type CardArchetype = "canvas" | "ledger";

export interface CardMeta {
  archetype: CardArchetype;
  /** Share-by-default switch. When true, `<Card>` renders the ShareTrigger. */
  shareable: boolean;
  /** Post-copy category term: "Check out {entity}'s {shareCategory} report". */
  shareCategory: (sport: string) => string;
}

export const CARD_META: Record<CardId, CardMeta> = {
  composite:   { archetype: "canvas", shareable: true,  shareCategory: () => "rating" },
  specialist:  { archetype: "canvas", shareable: true,  shareCategory: () => "special" },
  trends:      { archetype: "canvas", shareable: true,  shareCategory: () => "season" },
  vibes:       { archetype: "canvas", shareable: true,  shareCategory: () => "vibes" },
  // Ledgers don't share their scrolling DOM. Leaderboard's bespoke top-N snapshot
  // is the fast-follow that flips it shareable; news/roster/transfers contribute
  // the Meta profile card when the profile itself is shared.
  leaderboard: { archetype: "ledger", shareable: false, shareCategory: () => "leaderboard" },
  news:        { archetype: "ledger", shareable: false, shareCategory: () => "news" },
  roster:      { archetype: "ledger", shareable: false, shareCategory: () => "roster" },
  transfers:   { archetype: "ledger", shareable: false, shareCategory: () => "transfers" },
};
