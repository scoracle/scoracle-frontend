import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

import type { VibeResponse } from "./vibe";
export type { VibeCurrent, VibeSnapshot, VibeResponse } from "./vibe";
async function fetchVibeImpl(sport: string, type: string, id: string): Promise<VibeResponse | null> {
    "use server";
    if (!sport || !id)
        return null;
    return fetchJsonOrNull<VibeResponse>(entityProductUrl(sport, type, id, "vibe"), "vibe");
}
export const getVibe = query(fetchVibeImpl, "vibe");
