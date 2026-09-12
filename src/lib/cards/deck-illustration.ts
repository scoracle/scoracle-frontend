import type { ProfileTab } from "../../contexts/profile";

/** Approved engraving compositions (2026-09-12). Profile shares the Scout's
 * mountains. Only Sigil keeps its full plate; the other drawings bleed off
 * the right edge to leave the reading field quiet. Values match the study. */
export const DECK_ILLUSTRATIONS = {
  scouting: { subject: "scouting", size: 135, left: 12, top: 4 },
  profile: { subject: "scouting", size: 135, left: 12, top: 4 },
  narratives: { subject: "narratives", size: 125, left: 15, top: 0 },
  transfers: { subject: "transfers", size: 135, left: 28, top: 0 },
  vibe: { subject: "vibe", size: 125, left: 12, top: 3 },
  momentum: { subject: "momentum", size: 145, left: 33, top: -5 },
  sigil: { subject: "sigil", size: 100, left: 0, top: 0 },
} as const satisfies Record<ProfileTab, { subject: string; size: number; left: number; top: number }>;

export function deckIllustrationStyle(deck: ProfileTab) {
  const art = DECK_ILLUSTRATIONS[deck];
  return {
    "--deck-illustration-src": `url(/deck-art/engraving-${art.subject}-v1.webp)`,
    "--deck-illustration-size": `${art.size}%`,
    "--deck-illustration-left": `${art.left}%`,
    "--deck-illustration-top": `${art.top}%`,
  };
}
