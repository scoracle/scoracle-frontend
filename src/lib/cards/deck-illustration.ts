import type { ProfileTab } from "../../contexts/profile";
import { displayScore } from "./tarot-deck";

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

/** B's approved poses: score 20 = 5%, 50 = -22.5%, 80 = -50%.
 * Hold the extremes inside the approved crop, rather than losing the orb
 * above/below the frame. Missing readings keep the original static plate. */
export function momentumIllustrationTop(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) return DECK_ILLUSTRATIONS.momentum.top;
  const progress = Math.max(0, Math.min(1, (displayScore(score) - 20) / 60));
  return 5 - 55 * progress;
}

export function deckIllustrationStyle(deck: ProfileTab, score?: number | null) {
  const art = DECK_ILLUSTRATIONS[deck];
  return {
    "--deck-illustration-src": `url(/deck-art/engraving-${art.subject}-v1.webp)`,
    "--deck-illustration-size": `${art.size}%`,
    "--deck-illustration-left": `${art.left}%`,
    "--deck-illustration-top": `${deck === "momentum" ? momentumIllustrationTop(score) : art.top}%`,
  };
}
