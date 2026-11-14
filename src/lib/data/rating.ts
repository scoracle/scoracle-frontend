import type { RatingDatapoint, RatingModeBlock } from "./stats";
export type { RatingDatapoint } from "./stats";
export interface RatingScores {
    season: number;
    /** Player position (e.g. "F-C"); null for teams. */
    position: string | null;
    /** Raw season composite. */
    rating: number | null;
    /** Positionless composite percentile (0-100). */
    rating_rank: number | null;
    /** Positionless magnitude of the season COMPOSITE (0-100, ~50 avg, SD 10) — the
     *  Rating headline score (symmetric with the Vibe's sentiment score). */
    rating_score: number | null;
    /** Per-datapoint breakdown; the card filters to in_spec / is_specialty. */
    rating_breakdown: RatingDatapoint[];
    /** PLAYERS ONLY: per-X rate-mode blocks. */
    rating_modes: Record<string, RatingModeBlock> | null;
}
export interface StatCommentary {
    body: string;
    /** The Scout's tweet-sized hook (the card contract, mig 226/232) — the
     *  report card's title line. Null for rows generated before the rollout. */
    headline?: string | null;
    notability: number;
    notability_components: Record<string, number>;
    season: number;
    prompt_version: string;
    generated_at: string;
    rating_trajectory: "rising" | "falling" | "steady" | null;
    rating_trajectory_label: string | null;
    rating_trajectory_components: Record<string, unknown> | null;
}
export interface RatingResponse {
    page: "rating";
    sport: string;
    entity_type: string;
    entity_id: number;
    season: number;
    /** Null when the entity has no rated season in scope. */
    rating: RatingScores | null;
    /** The on-field identity analysis; null until the backfill reaches this entity-season. */
    commentary: StatCommentary | null;
}
