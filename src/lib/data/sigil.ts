export interface SigilCurrent {
    /** Holistic synthesis score (1-100). Served as `heat` since the mig-226
     *  card-contract rename (was `score`). */
    heat: number;
    /** Convergence diagnostic of the decided card. */
    convergence: number | null;
    /** Previous score before this synthesis run; null if this is the first. */
    previous_score: number | null;
    /** The Oracle's tweet-sized hook (the card contract, mig 232) — the card's
     *  title line. Null for rows voiced before the rollout. */
    headline?: string | null;
    /** 2-4 sentence Oracle reading — the card's voice. Served as `body` since the
     *  card-contract rename (was `reading`). Null only when the entity has never
     *  been voiced (the served row always carries its current voice, fresh or
     *  carried forward). */
    body: string | null;
    /** Computed omen, closed set: ascendant | steady | waning | crossroads. */
    omen: string | null;
    /** When the reading was actually DRAWN — the timestamp the credit renders.
     *  Older than generated_at on carried-forward voices, by design. */
    voiced_at: string | null;
    voice_model_version: string | null;
    voice_prompt_version: string | null;
    model_version: string;
    prompt_version: string;
    generated_at: string;
}
export interface SigilPoint {
    score: number;
    generated_at: string;
}
export interface SigilResponse {
    page: "sigil";
    sport: string;
    entity_type: string;
    entity_id: number;
    /** Latest REAL synthesis at any age (serve-latest), or null when the entity
     *  has never been scored. Carries the Oracle voice fields. */
    current: SigilCurrent | null;
    /** Up to 14 recent points (newest first) for the trend sparkline. */
    history: SigilPoint[];
}
