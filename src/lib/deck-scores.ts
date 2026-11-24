import { createMemo } from "solid-js";
import type { ProfileReads } from "./profile-products";
/** Card and ring readers share the profile owner; these memos never fetch. */
import type { ProfileContextValue, ProfileTab } from "./profile-context";
/** A live accessor for one deck's raw score; null/undefined = unread. */
export type DeckScoreReader = () => number | null | undefined;
/**
 * Create the reader for one deck. Must be called during component setup
 * (it creates a createMemo under the hood). Isolate errors per reader so
 * one deck's outage cannot drop the other readings. The meta card omits
 * unavailable scores and redistributes the remaining values.
 */
export function createDeckScoreReader(ctx: ProfileContextValue, data: ProfileReads, deck: ProfileTab): DeckScoreReader {
    switch (deck) {
        // Scouting (the report) and Profile (the chart) share the Scout's one
        // number — the baseline composite — so his two faces can never disagree
        // (the Scouting/Profile split, 2026-09-05).
        case "scouting":
        case "profile": {
            const stats = createMemo(data.stats);
            return () => {
                const rating = stats()?.rating;
                if (!rating)
                    return null;
                return ctx.type() === "team" ? rating.rating_rank : rating.rating_score;
            };
        }
        case "narratives": {
            const news = createMemo(data.news);
            return () => news()?.card_score;
        }
        case "transfers": {
            const transfers = createMemo(data.transfers);
            return () => transfers()?.card_score;
        }
        case "vibe": {
            const vibe = createMemo(data.vibe);
            return () => vibe()?.current?.heat ?? null;
        }
        case "momentum": {
            const summary = createMemo(data.summary);
            return () => {
                const response = summary();
                const score = response?.summary?.card_score;
                if (score != null)
                    return score;
                const s = response?.scores?.momentum_score;
                if (s != null)
                    return 50 + s / 2;
                // Served as `heat` since the card-contract rename (was read as the
                // never-present `score` until 2026-09-05).
                const v = response?.summary?.heat;
                return v != null ? 50 + 10 * v : null;
            };
        }
        case "sigil": {
            const sigil = createMemo(data.sigil);
            return () => {
                const score = sigil()?.current?.heat;
                return score != null ? (score as number) : null;
            };
        }
    }
}
