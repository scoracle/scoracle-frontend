/**
 * Card Registry — the single source of truth for the profile page's cards: what
 * exists and everything each one needs in-app. Each Card owns its own product
 * read (createAsync + query() inside the component), so an entry here is just
 * identity + chrome: id, label, body, skeleton, visibility, declared controls.
 *
 * The six character cards in table order (Characters Phase 1, locked
 * 2026-07-22): Scouting (The Scout), Narratives (The Journalist), Transfers/
 * Trades (The Insider — label is sport-aware via transferNoun in ContentShell),
 * Vibe (The Influencer), Momentum (The Analyst), Sigil (the Oracle). All six
 * show for players AND teams.
 */

import type { JSX } from "solid-js";
import type { ProfileTab } from "../../contexts/profile";
import type { EntityType } from "../../lib/types";

/** A view control this card declares for the NavWell conditions line below the tab rail. */
export type CardControl = "model" | "rate" | "scope" | "season" | "compare" | "newsScope";

import ScoutingCard from "./ScoutingCard";
import NarrativesCard from "./NarrativesCard";
import TransfersCard from "./TransfersCard";
import VibeCard from "./VibeCard";
import MomentumCard from "./MomentumCard";
import SigilCard from "./SigilCard";

export interface CardDef {
  id: ProfileTab;
  label: string;
  body: () => JSX.Element;
  /** Pane Suspense fallback. Omit for the default whole-card loading face
   *  (`<LoadingCard label={label} />` — ContentShell supplies it). */
  fallback?: () => JSX.Element;
  showFor?: (type: EntityType) => boolean;
  controls?: readonly CardControl[];
}

export const CARD_REGISTRY: ReadonlyArray<CardDef> = [
  {
    id: "scouting",
    label: "Scouting",
    body: () => <ScoutingCard />,
    controls: ["model", "rate", "scope", "season", "compare"],
  },
  {
    id: "narratives",
    label: "Narratives",
    body: () => <NarrativesCard />,
    controls: ["newsScope"],
  },
  {
    id: "transfers",
    label: "Transfers",
    body: () => <TransfersCard />,
    controls: ["newsScope"],
  },
  {
    id: "vibe",
    label: "Vibe",
    body: () => <VibeCard />,
  },
  {
    id: "momentum",
    label: "Momentum",
    body: () => <MomentumCard />,
    controls: ["season"],
  },
  {
    id: "sigil",
    label: "Sigil",
    body: () => <SigilCard />,
  },
];
