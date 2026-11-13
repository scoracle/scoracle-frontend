/**
 * Stats product fetcher (/{sport}/{type}/{id}/stats). One entity's season
 * Composite/Specialist rating (+ ranks + specialty + that season's team) and the
 * per-event dual-rating series that powers the Trends sparkline. The stat
 * commentary is its own product now (/special, getSpecial).
 *
 * Like trends, the endpoint returns 200 for any *valid* request — entity
 * existence is the profile endpoint's job. A missing/unrated entity comes back
 * 200 with `rating: null` and `events: []` (verified against the live API), so
 * the Card keys its empty state off `rating == null` rather than an error. A
 * 404 here would be unexpected; we surface it as null defensively. Server-bound
 * via "use server".
 */
import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";
/** One datapoint that feeds the rating engine's Composite/Specialist (backend
 *  migration 030). The frontend draws `pct` (a 0-100 percentile — the core
 *  principle: store the z, serve a percentile); `z` is the raw contribution,
 *  fine-print at most. Composite tab pizzas the `in_comp` rows; the Specialist
 *  tab heros the `is_specialty` row. */
export * from "./stats";
import type { StatsResponse } from "./stats";
async function fetchStatsImpl(sport: string, type: string, id: string, season?: number | null): Promise<StatsResponse | null> {
    "use server";
    if (!sport || !type || !id)
        return null;
    return fetchJsonOrNull<StatsResponse>(entityProductUrl(sport, type, id, "stats", season), "stats");
}
export const getStats = query(fetchStatsImpl, "stats");
