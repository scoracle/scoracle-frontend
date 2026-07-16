/**
 * Card Registry — the single source of truth for the profile page's cards: what
 * exists and everything each one needs in-app. Each Card owns its own product
 * read (createAsync + query() inside the component), so an entry here is just
 * identity + chrome: id, label, body, skeleton, visibility, declared controls.
 */

import type { JSX } from "solid-js";
import type { ProfileTab } from "../../contexts/profile";
import type { EntityType } from "../../lib/types";

/** A view control this card declares for the Slate conditions line below the tab rail. */
export type CardControl = "model" | "rate" | "scope" | "season" | "compare" | "newsFacet" | "newsScope";

import StatsCard from "./StatsCard";
import RatingCard from "./RatingCard";
import MomentumCard from "./MomentumCard";
import SigilCard from "./SigilCard";
import NewsCard from "./NewsCard";

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
    id: "stats",
    label: "Stats",
    body: () => <StatsCard />,
    controls: ["model", "rate", "scope", "season", "compare"],
  },
  {
    id: "rating",
    label: "Rating",
    body: () => <RatingCard />,
    controls: ["rate", "season"],
  },
  {
    id: "news",
    label: "News",
    body: () => <NewsCard />,
    controls: ["newsFacet", "newsScope"],
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
