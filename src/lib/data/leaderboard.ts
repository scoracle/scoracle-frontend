import type { NewsTimeScope, NewsTrajectory, NewsTrajectoryComponents } from "./news";
export interface LeaderboardEntry {
    entity_type: string;
    id: number;
    name: string;
    image: string | null;
    position: string | null;
    team_id: number | null;
    team_name: string | null;
    team_code: string | null;
    team_logo: string | null;
    league_id: number | null;
    /** Raw season composite (card-contract key names: rating / rating_rank /
     *  rating_score). */
    rating: number | null;
    /** All-time percentile (0-100, higher = better). */
    rating_rank: number | null;
    /** Magnitude score (0-100, ~50 = average, SD 10) — the displayed Rating. */
    rating_score: number | null;
    /** PLAYERS, Fantasy board (backend migration 046): box-score fantasy points and
     *  its positionless percentile. Null on non-fantasy boards / teams / sports w/o a preset. */
    fantasy_points?: number | null;
    fantasy_rank?: number | null;
    /** 1-based position on the *current* board (respects the active scope sort). */
    rank: number | null;
}
export interface LeaderboardResponse {
    page: "leaderboard";
    sport: string;
    entity_type: string;
    /** The season this board reflects (the requested one, or the latest rated). */
    season: number;
    /** Every season with a composite rating for this sport+entity_type, newest
     *  first — powers the leaderboard's season dropdown. */
    available_seasons: number[];
    /** Active board: "composite", "sigil", or a sigil label. */
    scope: string;
    count: number;
    leaders: LeaderboardEntry[];
}
export interface BoardEntry {
    entity_type: string;
    id: number;
    name: string;
    image: string | null;
    team_id: number | null;
    team_name: string | null;
    team_code: string | null;
    team_logo: string | null;
    heat: number;
    headline: string | null;
    rank: number;
}
export interface VibeLeader extends BoardEntry {
    generated_at: string | null;
}
export interface VibesLeaderboardResponse {
    page: "vibes_leaderboard";
    sport: string;
    entity_type: string;
    count: number;
    leaders: VibeLeader[];
}
export interface SigilLeader extends BoardEntry {
    previous_score: number | null;
    generated_at: string | null;
}
export interface SigilLeaderboardResponse {
    page: "sigil_leaderboard";
    sport: string;
    entity_type: string;
    season: number;
    count: number;
    leaders: SigilLeader[];
}
export interface NewsLeader extends BoardEntry {
    updated_at: string | null;
    generated_at: string | null;
    source_count: number;
    source_names: string[];
    source_latest_at: string | null;
    source_oldest_at: string | null;
    trajectory: NewsTrajectory | null;
    trajectory_label: string | null;
}
export interface NewsLeaderboardResponse {
    page: "news_leaderboard";
    sport: string;
    entity_type: string;
    scope: NewsTimeScope;
    count: number;
    leaders: NewsLeader[];
}
export interface TransferLeader {
    player_id: number;
    player_name: string;
    player_image: string | null;
    team_id: number;
    team_name: string;
    team_code: string | null;
    team_logo: string | null;
    heat: number;
    direction: string | null;
    stage: string | null;
    /** The Insider's vetted one-sentence read (served as `headline` since the
     *  card-contract rename; was `summary`/`gemma_summary`). */
    headline: string | null;
    subject_type?: string | null;
    updated_at: string | null;
    source_count: number;
    source_names: string[];
    source_latest_at: string | null;
    source_oldest_at: string | null;
    trajectory: NewsTrajectory | null;
    trajectory_label: string | null;
    trajectory_components: NewsTrajectoryComponents;
    rank: number;
}
export interface TransfersLeaderboardResponse {
    page: "transfers_leaderboard";
    sport: string;
    scope: NewsTimeScope;
    count: number;
    rumors: TransferLeader[];
}
export interface TrendingLeader extends BoardEntry {
    slope: number;
}
export interface TrendingLeaderboardResponse {
    page: "trending_leaderboard";
    metric: "vibe" | "rating";
    sport: string;
    entity_type: string;
    count: number;
    leaders: TrendingLeader[];
}
export type { HomeMover } from "./home-movers";
