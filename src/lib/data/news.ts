export interface NewsTimeScope {
    key: "daily";
    label: string;
    starts_at: string;
    ends_at: string;
}
export type NewsTrajectory = "developing_story" | "heating_up" | "cooling_off";
export interface NewsTrajectoryComponents {
    [key: string]: number | string | boolean | null | undefined;
}
export interface Narrative {
    narrative_title: string;
    body: string;
    /** 0-100 per-narrative impact (volume × sources × recency); ranks the news leaderboard. */
    impact: number;
    impact_components: Record<string, number>;
    source_attribution: string | null;
    input_news_ids: number[];
    updated_at: string | null;
    source_count: number;
    source_names: string[];
    source_latest_at: string | null;
    source_oldest_at: string | null;
    trajectory: NewsTrajectory | null;
    trajectory_label: string | null;
    trajectory_components: NewsTrajectoryComponents;
    generated_at: string;
}
export interface NewsResponse {
    page: "news";
    sport: string;
    entity_type: string;
    entity_id: number;
    scope: NewsTimeScope;
    narratives: Narrative[];
    /** The Journalist's card score (1-99 busyness) — latest read, scope-independent.
     *  Optional: pre-rollout responses omit it; null until the entity regenerates. */
    card_score?: number | null;
    /** The Journalist's entity-level card hook (score + headline + body contract,
     *  backend mig 232): his tweet-style read of the whole cycle. Null until the
     *  entity regenerates under the headline contract. */
    headline?: string | null;
}
