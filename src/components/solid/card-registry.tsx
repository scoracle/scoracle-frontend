/**
 * Card Registry — the single source of truth for the profile page's cards: what
 * exists and everything each one needs in-app.
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

import { getMomentum } from "../../lib/data/momentum.server";
import { getStats } from "../../lib/data/stats.server";
import { getRating } from "../../lib/data/rating.server";
import { getNews } from "../../lib/data/news.server";
import { getTransfers } from "../../lib/data/transfers.server";
import { getSigil } from "../../lib/data/sigil.server";

export interface CardDef {
  id: ProfileTab;
  label: string;
  body: () => JSX.Element;
  fallback: () => JSX.Element;
  preload: (sport: string, type: EntityType, id: string, season: number | null) => void;
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
    preload: (sport, type, id, season) => void getStats(sport, type, id, season),
  },
  {
    id: "rating",
    label: "Rating",
    body: () => <RatingCard />,
    fallback: () => <RatingCardSkeleton />,
    controls: ["rate", "season"],
    preload: (sport, type, id, season) => void getRating(sport, type, id, season),
  },
  {
    id: "news",
    label: "News",
    body: () => <NewsCard />,
    fallback: () => <NewsCardSkeleton />,
    controls: ["newsFacet", "newsScope"],
    preload: (sport, type, id) => {
      void getNews(sport, type, id);
      void getTransfers(sport, type, id);
    },
  },
  {
    id: "momentum",
    label: "Momentum",
    body: () => <MomentumCard />,
    fallback: () => <MomentumCardSkeleton />,
    controls: ["season"],
    preload: (sport, type, id, season) => {
      void getStats(sport, type, id, season);
      void getMomentum(sport, type, id, season);
    },
  },
  {
    id: "sigil",
    label: "Sigil",
    body: () => <SigilCard />,
    fallback: () => <SigilCardSkeleton />,
    preload: (sport, type, id) => void getSigil(sport, type, id),
  },
];
