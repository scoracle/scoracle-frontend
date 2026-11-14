import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readProduct } from '../../lib/product.server';
import { readHomeMovers } from '../../lib/data/home-movers';

export const GET: APIRoute = async ({ request, url }) => {
  if (url.search) return Response.json({ error: 'Invalid product parameters' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  const movers = await readHomeMovers(['nba', 'nfl', 'football'], async (sport, metric, direction) => {
    const response = await readProduct(request, `${sport}/leaderboard/momentum?metric=${metric}&limit=1&direction=${direction}`, env);
    return response.ok ? response.json() : null;
  });
  return Response.json(movers, { headers: { 'Cache-Control': 'no-store' } });
};
