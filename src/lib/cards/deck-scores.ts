/**
 * deck-scores — per-deck score readers for the meta card's ring (§06,
 * Swords set 2026-08-04): the six character values that sit around the
 * crest, one reader per deck.
 *
 * Each reader mirrors its card's own derivation (the card component stays
 * the SSOT for the nuance — cross-references below), and rides the SAME
 * server query() the card pane uses, so the meta card adds no network
 * beyond what the eagerly-mounted panes already fetch.
 *
 * KNOWN DUPLICATION (flagged for the <Board>-era cleanup pass): the card
 * components each derive their score inline; unifying them onto these
 * readers is part of the post-Card legacy cleanout.
 *
 *   scouting   → ScoutingCard.tsx  (baseline composite: team rank / player score)
 *   narratives → NarrativesCard.tsx (wire card_score, busyness scale)
 *   transfers  → TransfersCard.tsx  (wire card_score, busyness scale)
 *   vibe       → VibeCard.tsx       (latest read's sentiment)
 *   momentum   → MomentumCard.tsx   (momentum_score recentered; verdict fallback)
 *   sigil      → SigilCard.tsx      (current sigil score)
 */
import { createAsync } from "@solidjs/router";
import { getStats } from "../data/stats.server";
import { getNews } from "../data/news.server";
import { getTransfers } from "../data/transfers.server";
import { getMomentum } from "../data/momentum.server";
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
    case "scouting": {
      const stats = createAsync(() => getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
      return () => {
        const rating = stats()?.rating;
        if (!rating) return null;
        return ctx.type() === "team" ? rating.rating_composite_rank : rating.rating_composite_score;
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
      const momentum = createAsync(() => getMomentum(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
      return () => {
        const snapshots = momentum()?.vibes.snapshots ?? [];
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
        const v = summary()?.summary?.score;
        return v != null ? 50 + 10 * v : null;
      };
    }
    case "sigil": {
      const sigil = createAsync(() => getSigil(ctx.sport(), ctx.type(), ctx.id()));
      return () => {
        const score = sigil()?.current?.score;
        return score != null ? (score as number) : null;
      };
    }
  }
}
