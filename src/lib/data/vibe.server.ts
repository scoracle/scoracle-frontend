/**
 * Vibe fetcher. 404 from the backend means "no blurb yet" (model still
 * training); we resolve to null instead of throwing so the UI's
 * "Training" placeholder renders cleanly. Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import { vibeUrl } from "../utils/data-sources";

export interface VibeRow {
  id: number;
  entity_type: string;
  entity_id: number;
  sport: string;
  trigger_type: string;
  sentiment: number | null;
  model_version: string;
  prompt_version: string;
  generated_at: string;
}

async function fetchVibeImpl(
  sport: string,
  type: string,
  id: string,
): Promise<VibeRow | null> {
  "use server";
  if (!sport || !type || !id) return null;
  const { url, headers } = vibeUrl(sport, type, id);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`vibe ${res.status}`);
  return (await res.json()) as VibeRow;
}

export const getVibe = query(fetchVibeImpl, "vibe");
