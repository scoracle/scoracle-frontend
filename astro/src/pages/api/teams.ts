import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readIdentityMaps } from '../../lib/identity.server';
export const GET: APIRoute = async ({ url }) => {
  const sport = url.searchParams.get('sport');
  const headers = { 'Cache-Control': 'no-store' };
  if (!['nba', 'nfl', 'football'].includes(sport ?? '') || [...url.searchParams.keys()].length !== 1) return Response.json({ error: 'Invalid sport' }, { status: 400, headers });
  try { const maps = await readIdentityMaps(env.ASSETS, new URL(`/data/${sport}-meta.json`, url)); return Response.json(maps.teams, { headers }); }
  catch { return Response.json({ error: 'Teams unavailable' }, { status: 503, headers }); }
};
