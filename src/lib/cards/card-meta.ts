/**
 * card-meta — the Card identity SSOT.
 *
 * Pure data, ZERO component imports — safe to pull into the `<Card>` component
 * and anything server-side alike. One `CardId` taxonomy across the whole
 * pillar; the in-app wiring (body / fallback / preload) lives in
 * `card-registry.tsx`, keyed by the same `CardId`.
 *
 * See scoracle-wiki/wiki/Architecture/Card Pillar.md.
 */
import type { ProfileTab } from "../../contexts/profile";
import type { EntityType } from "../types";

/** Rendered profile tabs plus standalone card identities. */
export type CardId = ProfileTab | "leaderboard";

/**
 * Client-facing pillar label for the convergence surfaces:
 *   scouting → "Scouting", momentum → "Momentum", sigil → "Sigil".
 * Returns null for the other cards — they use the registry's static label
 * (Transfers/Trades is sport-aware via `transferNoun`, handled at the nav).
 * Same labels for players and teams (the crown Sigil applies to both). The
 * single source for these labels across the nav, the cards, and the meta
 * widget.
 */
export function pillarLabel(cardId: CardId, _type: EntityType): string | null {
  switch (cardId) {
    case "scouting":
      return "Scouting";
    case "sigil":
      return "Sigil";
    case "momentum":
      return "Momentum";
    default:
      return null;
  }
}

/**
 * The character who reveals each card (wiki/Characters.md — the names are
 * the identities, locked 2026-07-21). Product copy uses these names; backend
 * stage keys are untouched. The Oracle's article is lowercase by doctrine.
 */
export function characterName(cardId: ProfileTab): string {
  switch (cardId) {
    case "scouting":
      return "The Scout";
    case "narratives":
      return "The Journalist";
    case "transfers":
      return "The Insider";
    case "vibe":
      return "The Influencer";
    case "momentum":
      return "The Analyst";
    case "sigil":
      return "the Oracle";
  }
}

/**
 * The player-movement noun, sport-aware: football calls a move a "transfer",
 * NBA/NFL call it a "trade". One source for the term across the profile
 * Transfers/Trades scope + card heading, the /leaderboard board rail, and the
 * home Rankings dropdown — so the word reads the same everywhere.
 * Case-insensitive on the sport id (callers pass it in varying case:
 * "nba", "FOOTBALL", …).
 */
export function transferNoun(sport: string): string {
  return sport.toLowerCase() === "football" ? "Transfers" : "Trades";
}

/**
 * Sports with a box-score fantasy-points preset (backend migration 046 → NFL PPR +
 * NBA DraftKings; 057 → football FPL-style). The single source for the Regular |
 * Fantasy model selector (ContentShell) and the leaderboard Fantasy board.
 * Each surface still data-gates on actual payload support.
 * Case-insensitive (callers pass "nba"/"FOOTBALL"/… in varying case).
 */
const FANTASY_SPORTS = new Set(["nba", "nfl", "football"]);
export function fantasySupported(sport: string): boolean {
  return FANTASY_SPORTS.has(sport.toLowerCase());
}

/** Canvas = chart/illustration; ledger = list/feed. */
export type CardArchetype = "canvas" | "ledger";

export interface CardMeta {
  archetype: CardArchetype;
}

export const CARD_META: Record<CardId, CardMeta> = {
  scouting:    { archetype: "canvas" },
  narratives:  { archetype: "ledger" },
  transfers:   { archetype: "ledger" },
  vibe:        { archetype: "ledger" },
  momentum:    { archetype: "canvas" },
  sigil:       { archetype: "canvas" },
  leaderboard: { archetype: "ledger" },
};
