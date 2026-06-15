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
 *   - players: composite → "Rating", specialist → "Special", vibe → "Vibe"
 *   - teams:   composite → "Rating",  vibe → "Vibe"  (no specialist — there are
 *     no specialist teams; the pillar is player-only)
 * Returns null for non-pillar cards (they use the registry's static label) and
 * for specialist on teams (the cell/tab is dropped). The single source for these
 * labels across the nav, the cards, the meta widget, and the OG headings.
 */
export function pillarLabel(cardId: CardId, type: EntityType): string | null {
  switch (cardId) {
    case "composite":
      return "Rating";
    case "specialist":
      return type === "team" ? null : "Special";
    case "vibes":
      return "Vibe";
    default:
      return null;
  }
}

/**
 * The player-movement noun, sport-aware: football calls a move a "transfer",
 * NBA/NFL call it a "trade". One source for the term across the profile
 * Transfers/Trades tab + card heading, the /leaderboard board rail, the home
 * Rankings dropdown, and the OG leaderboard snapshot — so the word reads the
 * same everywhere. Case-insensitive on the sport id (callers pass it in varying
 * case: "nba", "FOOTBALL", …).
 */
export function transferNoun(sport: string): string {
  return sport.toLowerCase() === "football" ? "Transfers" : "Trades";
}

/**
 * Sports with a box-score fantasy-points preset (backend migration 046 → NFL PPR +
 * NBA DraftKings; 057 → football FPL-style). The single source for the Regular |
 * Fantasy model selector (ContentShell), the roster fantasy column (RosterCard), and
 * the leaderboard Fantasy board — flip a sport in here and all three surfaces light up
 * together (each still data-gated: the selector/board also checks the payload exists).
 * Case-insensitive (callers pass "nba"/"FOOTBALL"/… in varying case).
 */
const FANTASY_SPORTS = new Set(["nba", "nfl", "football"]);
export function fantasySupported(sport: string): boolean {
  return FANTASY_SPORTS.has(sport.toLowerCase());
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

// Share is PAUSED platform-wide (2026-06-10): every `shareable` is false, so no
// surface renders a trigger. The share machinery (ShareTrigger, dispatch,
// ShareFallbackModal, OG routes) is intact and will be critical later — re-enable
// per card by flipping its flag back to true. The leaderboard page's bespoke
// share button reads its flag here too.
export const CARD_META: Record<CardId, CardMeta> = {
  composite:   { archetype: "canvas", shareable: false, shareCategory: () => "rating" },
  specialist:  { archetype: "canvas", shareable: false, shareCategory: () => "special" },
  trends:      { archetype: "canvas", shareable: false, shareCategory: () => "season" },
  vibes:       { archetype: "canvas", shareable: false, shareCategory: () => "vibes" },
  // Leaderboard shares via its bespoke top-N snapshot OG body (the dedicated
  // /leaderboard page wires the share + og:image directly, since it's a page, not a
  // profile Card). news/roster/transfers contribute the Meta profile card when the
  // profile itself is shared.
  leaderboard: { archetype: "ledger", shareable: false, shareCategory: () => "leaderboard" },
  news:        { archetype: "ledger", shareable: false, shareCategory: () => "news" },
  roster:      { archetype: "ledger", shareable: false, shareCategory: () => "roster" },
  transfers:   { archetype: "ledger", shareable: false, shareCategory: () => "transfers" },
};
