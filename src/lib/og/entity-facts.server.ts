/**
 * Entity-facts for the share-card OG header (name / image / subtitle).
 *
 * Source: the SAME bundled local meta the in-app autocomplete + EntityMeta use
 * (`/data/{sport}-meta.json`) — NOT a backend call. Read via the handler's
 * EVENT-BOUND `fetchAsset`: the OG API route can't use the component-tree
 * `getRequestEvent()` / `getCloudflareEnv()` path (out of scope for API routes),
 * so `entityDataStore.loadMeta` (which goes through that global) won't resolve
 * here — we read the asset directly with the same fetcher the route uses for
 * fonts/wasm/frame.
 *
 * Resolution mirrors `EntityMeta`'s resolvePlayer/resolveTeam so the OG header
 * matches the live meta widget: player → name + photo (falling back to the team
 * crest) + team-name subtitle; team → name + logo + conference/city subtitle.
 */
import type { AssetFetch } from "../utils/cloudflare-env";
import type { PlayerMeta, TeamMeta } from "../types";

export interface OgEntityFacts {
  name: string;
  imageUrl: string;
  subtitle: string;
}

interface SportMeta {
  players: Map<string, PlayerMeta>;
  teams: Map<string, TeamMeta>;
}

// Per-isolate cache — the Worker reuses module state across requests, so the
// meta JSON is fetched + parsed at most once per sport per isolate.
const cache = new Map<string, SportMeta>();

async function loadSportMeta(sport: string, fetchAsset: AssetFetch): Promise<SportMeta | null> {
  const key = sport.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const res = await fetchAsset(`/data/${key}-meta.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as { players?: PlayerMeta[]; teams?: TeamMeta[] };
    const players = new Map<string, PlayerMeta>();
    for (const p of json.players ?? []) players.set(String(p.id), p);
    const teams = new Map<string, TeamMeta>();
    for (const t of json.teams ?? []) teams.set(String(t.id), t);
    const meta: SportMeta = { players, teams };
    cache.set(key, meta);
    return meta;
  } catch {
    return null;
  }
}

export async function getOgEntityFacts(
  sport: string,
  type: string,
  id: string,
  fetchAsset: AssetFetch,
): Promise<OgEntityFacts | null> {
  if (!sport || !type || !id) return null;
  const meta = await loadSportMeta(sport, fetchAsset);
  if (!meta) return null;

  if (type === "team") {
    const t = meta.teams.get(id);
    if (!t) return null;
    return {
      name: t.name || "Unknown",
      imageUrl: t.logo_url || "",
      subtitle: t.conference?.trim() || t.city || sport.toUpperCase(),
    };
  }

  const p = meta.players.get(id);
  if (!p) return null;
  const name =
    p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";
  // Player photo, falling back to the team crest (NBA/NFL have no photo_url).
  let imageUrl = p.photo_url || "";
  if (!imageUrl && p.team?.id != null) {
    imageUrl = meta.teams.get(String(p.team.id))?.logo_url || "";
  }
  return { name, imageUrl, subtitle: p.team?.name || "" };
}
