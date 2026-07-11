/**
 * Card Registry — the single source of truth for the profile page's cards: what
 * exists and everything each one needs in-app. Each Card owns its own product
 * read (createAsync + query() inside the component), so an entry here is just
 * identity + chrome: id, label, body, skeleton, visibility, declared controls.
 */

import type { JSX } from "solid-js";
import type { ProfileTab } from "../../contexts/profile";
import type { EntityType } from "../../lib/types";

/** A view control this card declares for the control <NavRail> below the item rail. */
export type CardControl = "model" | "rate" | "scope" | "season" | "compare" | "newsFacet" | "newsScope";

import StatsCard, { StatsCardSkeleton } from "./StatsCard";
import RatingCard, { RatingCardSkeleton } from "./RatingCard";
import MomentumCard, { MomentumCardSkeleton } from "./MomentumCard";
import SigilCard, { SigilCardSkeleton } from "./SigilCard";
import NewsCard, { NewsCardSkeleton } from "./NewsCard";

export interface CardDef {
  id: ProfileTab;
  label: string;
  body: () => JSX.Element;
  fallback: () => JSX.Element;
  showFor?: (type: EntityType) => boolean;
  controls?: readonly CardControl[];
}

export const CARD_REGISTRY: ReadonlyArray<CardDef> = [
  {
    id: "stats",
    label: "Stats",
    body: () => <StatsCard />,
    fallback: () => <StatsCardSkeleton />,
    controls: ["model", "rate", "scope", "season", "compare"],
  },
  {
    id: "rating",
    label: "Rating",
    body: () => <RatingCard />,
    fallback: () => <RatingCardSkeleton />,
    controls: ["rate", "season"],
  },
  {
    id: "news",
    label: "News",
    body: () => <NewsCard />,
    fallback: () => <NewsCardSkeleton />,
    controls: ["newsFacet", "newsScope"],
  },
  {
    id: "momentum",
    label: "Momentum",
    body: () => <MomentumCard />,
    fallback: () => <MomentumCardSkeleton />,
    controls: ["season"],
  },
  {
    id: "sigil",
    label: "Sigil",
    body: () => <SigilCard />,
    fallback: () => <SigilCardSkeleton />,
  },
];
