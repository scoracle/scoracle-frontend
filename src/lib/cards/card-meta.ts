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

/** Every card id == its `?tab=` value == its OG `:cardType` == its `ShareTab`. */
export type CardId = ProfileTab;

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
  specialist:  { archetype: "canvas", shareable: true,  shareCategory: () => "specialty" },
  starline:    { archetype: "canvas", shareable: true,  shareCategory: () => "season" },
  vibes:       { archetype: "canvas", shareable: true,  shareCategory: () => "vibes" },
  // Ledgers don't share their scrolling DOM. Leaderboard's bespoke top-N snapshot
  // is the fast-follow that flips it shareable; news/roster/transfers contribute
  // the Meta profile card when the profile itself is shared.
  leaderboard: { archetype: "ledger", shareable: false, shareCategory: () => "leaderboard" },
  news:        { archetype: "ledger", shareable: false, shareCategory: () => "news" },
  roster:      { archetype: "ledger", shareable: false, shareCategory: () => "roster" },
  transfers:   { archetype: "ledger", shareable: false, shareCategory: () => "transfers" },
};
