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
import { ratingForMode, templateForMode, eligiblePizzaDatapoints } from "../data/stats.server";
import { leadVibeRead } from "../data/vibe.server";
import type { ProfileReads } from "../data/profile-data";
import type { ProfileContextValue, ProfileTab } from "../../contexts/profile";
/**
 * True when this deck's card has something to render for the context's entity.
 * Reads the live context accessors once, up front — the reads that matter to
 * presence (entity, season, news scope, rate mode) are the same ones the card
 * itself reads, so a conditions change re-asks the question.
 */
export async function deckHasContent(ctx: ProfileContextValue, reads: ProfileReads, deck: ProfileTab): Promise<boolean> {
    // Capture reactive dependencies before the first await.
    const mode = ctx.rateMode();
    switch (deck) {
        // The Scouting/Profile split (2026-09-05): Scouting is dealt when the
        // Scout has WRITTEN (the report is the card); Profile is dealt when there
        // are wedges to draw (the chart is the card). An entity can hold either
        // without the other.
        case "scouting": {
            const report = await reads.report();
            return report?.commentary?.body != null;
        }
        case "profile": {
            const rating = (await reads.stats())?.rating;
            if (!rating)
                return false;
            // ProfileCard draws the counting-stat template when the mode has one
            // and the z-score pizza otherwise — either set of wedges is a card.
            return (eligiblePizzaDatapoints(ratingForMode(rating, mode)).length > 0 ||
                (templateForMode(rating, mode)?.length ?? 0) > 0);
        }
        // The list reads stay optional the whole way down, like the cards' own:
        // a partial payload is a card with nothing to say, not a thrown read.
        case "narratives": {
            const news = await reads.news();
            return (news?.narratives?.length ?? 0) > 0;
        }
        case "transfers": {
            const transfers = await reads.transfers();
            return (transfers?.transfers?.length ?? 0) > 0;
        }
        case "vibe": {
            // Dealt only when the serve-latest selector finds a read to serve — a
            // window of bodyless marker rows must not deal an empty card frame.
            const vibe = await reads.vibe();
            return leadVibeRead(vibe?.snapshots) != null;
        }
        case "momentum": {
            // Three sources, any one of which carries the card (MomentumCard.isEmpty).
            const [stats, trends, summary] = await Promise.all([
                reads.stats(),
                reads.momentum(),
                reads.summary(),
            ]);
            const ratedEvents = stats?.rating != null &&
                (stats.events ?? []).some((e) => e.rating_pct != null);
            const sentiment = (trends?.entity_season_sentiment_series?.length ?? 0) > 0;
            return ratedEvents || sentiment || summary?.summary != null;
        }
        case "sigil": {
            // The Oracle needs a drawn archetype, and the draw needs a score.
            const current = (await reads.sigil())?.current;
            return current != null && current.heat != null;
        }
    }
}
