import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readProduct } from '../../lib/product.server';
import { getPositionGroupsForSport } from '../../lib/utils/position-groups';
import type { TeamMeta } from '../../lib/types';
export const GET: APIRoute = async ({ request, url }) => {
  const sport = url.searchParams.get('sport');
  const headers = { 'Cache-Control': 'no-store' };
  if (!['nba', 'nfl', 'football'].includes(sport ?? '') || [...url.searchParams.keys()].length !== 1) return Response.json({ error: 'Invalid sport' }, { status: 400, headers });
  const response = await readProduct(request, `${sport}/autofill?type=team&limit=200`, env);
  if (!response.ok) return Response.json({ error: 'Options unavailable' }, { status: 503, headers });
  const data = await response.json() as { results?: TeamMeta[] } | null;
  return Response.json({
    teams: (data?.results ?? []).map(t => ({ ...t, id: Number(t.id) })),
    positions: getPositionGroupsForSport(sport!).sort(),
  }, { headers });
};
