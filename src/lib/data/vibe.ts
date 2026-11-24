/** One coherent published reading; a missing score does not hide its prose. */
export interface VibeCurrent {
    id: number;
    heat: number | null;
    headline: string;
    body: string;
    trigger_type: string;
    generated_at: string;
    model_version: string;
    prompt_version: string;
}
/** Scored history is separate from the current reader-facing card. */
export interface VibeSnapshot {
    sentiment: number;
    generated_at: string;
    trigger_type: string;
    headline: string | null;
    body: string | null;
}
export interface VibeResponse {
    page: "vibe";
    sport: string;
    entity_type: string;
    entity_id: number;
    current: VibeCurrent | null;
    window_days: number;
    snapshots: VibeSnapshot[];
}
