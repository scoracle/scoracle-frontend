/**
 * deck-scores — per-deck score readers for the meta card's ring (§06,
 * Swords set 2026-08-04): the six character values that sit around the
 * crest, one reader per deck.
 *
 * This IS the single source of truth for every card's display score: the six
 * card components (ScoutingCard, NarrativesCard, TransfersCard, VibeCard,
 * MomentumCard, SigilCard) each call createDeckScoreReader for their score
 * prop, and the meta-card ring reads the same readers. So a score rule change
 * is a one-place edit and the ring and the card can never disagree — each
 * reader rides the SAME server query() the card pane uses, adding no network
 * beyond what the eagerly-mounted panes already fetch.
 */
import { createAsync } from "@solidjs/router";
import { getStats } from "../data/stats.server";
import { getNews } from "../data/news.server";
import { getVibe } from "../data/vibe.server";
import { getTransfers } from "../data/transfers.server";
import { getMomentumSummary } from "../data/momentum-summary.server";
import { getSigil } from "../data/sigil.server";
import type { ProfileContextValue, ProfileTab } from "../../contexts/profile";

/** A live accessor for one deck's raw score; null/undefined = unread. */
export type DeckScoreReader = () => number | null | undefined;

/**
 * Create the reader for one deck. Must be called during component setup
 * (it creates a createAsync under the hood). Wrap the consuming slot in
 * its own Suspense/ErrorBoundary so one deck's outage reads as unclear
 * without dropping the ring.
 */
export function createDeckScoreReader(
  ctx: ProfileContextValue,
  deck: ProfileTab,
): DeckScoreReader {
  switch (deck) {
    // Scouting (the report) and Profile (the chart) share the Scout's one
    // number — the baseline composite — so his two faces can never disagree
    // (the Scouting/Profile split, 2026-09-05).
    case "scouting":
    case "profile": {
      const stats = createAsync(() => getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
      return () => {
        const rating = stats()?.rating;
        if (!rating) return null;
        return ctx.type() === "team" ? rating.rating_rank : rating.rating_score;
      };
    }
    case "narratives": {
      const news = createAsync(() => getNews(ctx.sport(), ctx.type(), ctx.id(), ctx.newsScope()));
      return () => news()?.card_score;
    }
    case "transfers": {
      const transfers = createAsync(() =>
        getTransfers(ctx.sport(), ctx.type(), ctx.id(), ctx.newsScope()),
      );
      return () => transfers()?.card_score;
    }
    case "vibe": {
      // Her own product since 2026-08-22. Was reading the Analyst's momentum
      // payload, which meant the Vibe card fetched /momentum for its score and
      // /vibe for its reads. Deliberately still the lead of the 7-day window
      // rather than `current` (serve-latest): the score must not outlive the
      // reads the card is showing, or a stale entity renders an empty card
      // wearing a number.
      const vibe = createAsync(() => getVibe(ctx.sport(), ctx.type(), ctx.id()));
      return () => {
        const snapshots = vibe()?.snapshots ?? [];
        if (snapshots.length === 0) return null;
        const lead = [...snapshots].sort((a, b) => b.generated_at.localeCompare(a.generated_at))[0];
        return lead?.sentiment;
      };
    }
    case "momentum": {
      const summary = createAsync(() =>
        getMomentumSummary(ctx.sport(), ctx.type(), ctx.id(), ctx.season()),
      );
      return () => {
        const s = summary()?.scores?.momentum_score;
        if (s != null) return 50 + s / 2;
        // Served as `heat` since the card-contract rename (was read as the
        // never-present `score` until 2026-09-05).
        const v = summary()?.summary?.heat;
        return v != null ? 50 + 10 * v : null;
      };
    }
    case "sigil": {
      const sigil = createAsync(() => getSigil(ctx.sport(), ctx.type(), ctx.id()));
      return () => {
        const score = sigil()?.current?.heat;
        return score != null ? (score as number) : null;
      };
    }
  }
}
