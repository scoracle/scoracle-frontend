import type { PlayerMeta, TeamMeta } from './types';

/** Asset failures propagate; only a successfully read map can establish absence. */
export async function readIdentityMaps(assets: { fetch: typeof fetch }, url: URL) {
  const response = await assets.fetch(url);
  if (!response.ok) throw new Error('Identity unavailable');
  const data = await response.json() as { players: PlayerMeta[]; teams: TeamMeta[] };
  return {
    players: Object.fromEntries(data.players.map(item => [String(item.id), item])),
    teams: Object.fromEntries(data.teams.map(item => [String(item.id), item])),
  };
}
