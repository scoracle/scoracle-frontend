import { ratingForMode, templateForMode, eligiblePizzaDatapoints } from "../data/stats";
import type { createProfileProducts } from "../profile-products";
import type { ProfileTab } from "../../contexts/profile";
type ProfileReads = ReturnType<typeof createProfileProducts>["reads"];
export type ProfileResults = { [K in keyof ProfileReads]?: Awaited<ReturnType<ProfileReads[K]>> };
export function hasDeckContent(data: ProfileResults, mode: string, deck: ProfileTab): boolean {
    switch (deck) {
        case "scouting": {
            if (data.report?.commentary?.body != null)
                return true;
            const rating = data.stats?.rating;
            if (!rating)
                return false;
            return (eligiblePizzaDatapoints(ratingForMode(rating, mode)).length > 0 ||
                (templateForMode(rating, mode)?.length ?? 0) > 0);
        }
        // The list reads stay optional the whole way down, like the cards' own:
        // a partial payload is a card with nothing to say, not a thrown read.
        case "narratives": {
            const news = data.news;
            return (news?.narratives?.length ?? 0) > 0;
        }
        case "transfers": {
            const transfers = data.transfers;
            return !!(transfers?.headline || transfers?.wire_read || transfers?.transfers?.length);
        }
        case "vibe": {
            const vibe = data.vibe;
            return vibe?.current != null;
        }
        case "momentum": {
            // Three sources, any one of which carries the card (MomentumCard.isEmpty).
            const { stats, momentum: trends, summary } = data;
            const ratedEvents = stats?.rating != null &&
                (stats.events ?? []).some((e) => e.rating_pct != null);
            const sentiment = (trends?.entity_season_sentiment_series?.length ?? 0) > 0;
            return ratedEvents || sentiment || summary?.summary != null;
        }
        case "sigil": {
            // The Oracle needs a drawn archetype, and the draw needs a score.
            const current = (data.sigil)?.current;
            return current != null && current.heat != null;
        }
    }
}
