/**
 * deck-content — per-deck content presence: does this character have anything
 * to say about this entity?
 *
 * Sibling to deck-scores.ts, same contract: ONE rule per deck, riding the SAME
 * server query() the card pane already fetches, so asking costs no network
 * beyond what the eagerly-mounted panes pull anyway.
 *
 * ReadingTable deals only the cards that answer true (Dynamic deck,
 * 2026-08-16). An entity with three readable cards gets a three-card deck and
 * a three-tab rail; an entity with none gets no rail and no deck at all — its
 * meta card sits alone on the desk. The deck is what the entity HAS, not a
 * fixed six with holes punched in it.
 *
 * Each rule mirrors its card's own top-level <Show> so the two can't disagree:
 * if the card would render the Veil (<EmptyCard>), it is not dealt. The Veil
 * stays as the backstop for the card in hand — a conditions change that empties
 * the card being read shows the Veil rather than yanking it off the table
 * mid-turn (ReadingTable holds the active card).
 */
import { getStats, ratingForMode, templateForMode, eligiblePizzaDatapoints } from "../data/stats.server";
import { getNews } from "../data/news.server";
import { getVibe, leadVibeRead } from "../data/vibe.server";
import { getTransfers } from "../data/transfers.server";
import { getMomentum } from "../data/momentum.server";
import { getMomentumSummary } from "../data/momentum-summary.server";
import { getRating } from "../data/rating.server";
import { getSigil } from "../data/sigil.server";
import type { ProfileContextValue, ProfileTab } from "../../contexts/profile";

/**
 * True when this deck's card has something to render for the context's entity.
 * Reads the live context accessors once, up front — the reads that matter to
 * presence (entity, season, news scope, rate mode) are the same ones the card
 * itself reads, so a conditions change re-asks the question.
 */
export async function deckHasContent(
  ctx: ProfileContextValue,
  deck: ProfileTab,
): Promise<boolean> {
  const sport = ctx.sport();
  const type = ctx.type();
  const id = ctx.id();

  switch (deck) {
    // The Scouting/Profile split (2026-09-05): Scouting is dealt when the
    // Scout has WRITTEN (the report is the card); Profile is dealt when there
    // are wedges to draw (the chart is the card). An entity can hold either
    // without the other.
    case "scouting": {
      const report = await getRating(sport, type, id, ctx.season());
      return report?.commentary?.body != null;
    }
    case "profile": {
      const rating = (await getStats(sport, type, id, ctx.season()))?.rating;
      if (!rating) return false;
      // ProfileCard draws the counting-stat template when the mode has one
      // and the z-score pizza otherwise — either set of wedges is a card.
      const mode = ctx.rateMode();
      return (
        eligiblePizzaDatapoints(ratingForMode(rating, mode)).length > 0 ||
        (templateForMode(rating, mode)?.length ?? 0) > 0
      );
    }
    // The list reads stay optional the whole way down, like the cards' own:
    // a partial payload is a card with nothing to say, not a thrown read.
    case "narratives": {
      const news = await getNews(sport, type, id, ctx.newsScope());
      return (news?.narratives?.length ?? 0) > 0;
    }
    case "transfers": {
      const transfers = await getTransfers(sport, type, id, ctx.newsScope());
      return (transfers?.transfers?.length ?? 0) > 0;
    }
    case "vibe": {
      // Dealt only when the serve-latest selector finds a read to serve — a
      // window of bodyless marker rows must not deal an empty card frame.
      const vibe = await getVibe(sport, type, id);
      return leadVibeRead(vibe?.snapshots) != null;
    }
    case "momentum": {
      // Three sources, any one of which carries the card (MomentumCard.isEmpty).
      const [stats, trends, summary] = await Promise.all([
        getStats(sport, type, id, ctx.season()),
        getMomentum(sport, type, id, ctx.season()),
        getMomentumSummary(sport, type, id, ctx.season()),
      ]);
      const ratedEvents =
        stats?.rating != null &&
        (stats.events ?? []).some((e) => e.rating_pct != null);
      const sentiment = (trends?.entity_season_sentiment_series?.length ?? 0) > 0;
      return ratedEvents || sentiment || summary?.summary != null;
    }
    case "sigil": {
      // The Oracle needs a drawn archetype, and the draw needs a score.
      const current = (await getSigil(sport, type, id))?.current;
      return current != null && current.heat != null;
    }
  }
}
