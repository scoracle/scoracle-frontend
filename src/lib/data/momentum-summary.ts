export interface MomentumSummaryVerdict {
    /** rising | falling | steady (DB CHECK-constrained; typed open for forward compat). */
    direction: "rising" | "falling" | "steady" | null;
    /** Signed verdict score, −5..5 (served as `heat` — the uniform number key). */
    heat: number | null;
    /** The Analyst's tweet-sized hook (the card contract). */
    headline?: string | null;
    /** The model's short prose read of WHY the trajectory is what it is. */
    body: string | null;
    model_version: string;
    prompt_version: string;
    generated_at: string;
}
export interface MomentumSummaryScores {
    /** Signed average of the present slopes. */
    momentum_score: number | null;
    vibe_slope: number | null;
    vibe_samples: number;
    vibe_window_start: string | null;
    vibe_window_end: string | null;
    rating_slope: number | null;
    rating_samples: number;
    rating_window_start: string | null;
    rating_window_end: string | null;
    season: number | null;
    generated_at: string;
}
export interface MomentumSummaryResponse {
    page: "momentum_summary";
    sport: string;
    entity_type: string;
    entity_id: number;
    /** Resolved season (explicit ?season or the current one). */
    season: number;
    summary: MomentumSummaryVerdict | null;
    scores: MomentumSummaryScores | null;
}
