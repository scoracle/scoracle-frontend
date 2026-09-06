/**
 * Card Registry — the single source of truth for the profile page's cards: what
 * exists and everything each one needs in-app. Each Card owns its own product
 * read (createAsync + query() inside the component), so an entry here is just
 * identity + chrome: id, label, body, skeleton, visibility, declared controls.
 *
 * The six character cards in table order (Characters Phase 1, locked
 * 2026-07-22): Scouting (The Scout), Narratives (The Journalist), Transfers/
 * Trades (The Insider — label is sport-aware via transferNoun in ReadingTable),
 * Vibe (The Influencer), Momentum (The Analyst), Sigil (the Oracle). All six
 * are available to players AND teams.
 *
 * Available, not dealt: this file says which cards EXIST, and `showFor` gates
 * them by entity TYPE. Whether a given entity actually holds one is a data
 * question, asked per card by lib/cards/deck-content and answered at the table
 * (ReadingTable) — an entity with three readable cards gets a three-card deck.
 */

import type { JSX } from "solid-js";
import type { ProfileTab } from "../../contexts/profile";
import type { EntityType } from "../../lib/types";

/** A view control this card declares for the NavWell conditions line below the tab rail. */
export type CardControl =
  | "model"
  | "rate"
  | "scope"
  | "season"
  | "compare"
  | "newsScope"
  | "view";

import ScoutingCard from "./ScoutingCard";
import ProfileCard from "./ProfileCard";
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
   *  (`<LoadingCard label={label} />` — ReadingTable supplies it). */
  fallback?: () => JSX.Element;
  showFor?: (type: EntityType) => boolean;
  controls?: readonly CardControl[];
}

export const CARD_REGISTRY: ReadonlyArray<CardDef> = [
  {
    // The Scout's REPORT — prose only, no controls: the rail's year + week
    // axis is its whole time frame (the scope collapse, 2026-09-05).
    id: "scouting",
    label: "Scouting",
    body: () => <ScoutingCard />,
  },
  {
    // The Scout's CHART — "just a visual tool" carrying every per-x scope
    // (the Scouting/Profile split, 2026-09-05). Compare rides here too.
    id: "profile",
    label: "Profile",
    body: () => <ProfileCard />,
    controls: ["model", "rate", "scope", "season", "compare"],
  },
  {
    // Year + week only (the scope cleanup, 2026-09-06) — the rail's clock is
    // every prose card's whole time frame.
    id: "narratives",
    label: "Narratives",
    body: () => <NarrativesCard />,
  },
  {
    id: "transfers",
    label: "Transfers",
    body: () => <TransfersCard />,
  },
  {
    id: "vibe",
    label: "Vibe",
    body: () => <VibeCard />,
  },
  {
    // One face (2026-09-06): hook → sparklines → verdict, always. The View
    // posture flip retired with its control; the week axis frames the card.
    id: "momentum",
    label: "Momentum",
    body: () => <MomentumCard />,
  },
  {
    id: "sigil",
    label: "Sigil",
    body: () => <SigilCard />,
  },
];
