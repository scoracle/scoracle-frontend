import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

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
    sources: { id: number; publisher: string | null; url: string; published_at: string | null }[];
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
async function fetchVibeImpl(sport: string, type: string, id: string): Promise<VibeResponse | null> {
    "use server";
    if (!sport || !id)
        return null;
    return fetchJsonOrNull<VibeResponse>(entityProductUrl(sport, type, id, "vibe"), "vibe");
}
export const getVibe = query(fetchVibeImpl, "vibe");
