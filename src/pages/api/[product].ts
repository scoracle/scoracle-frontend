import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { profileProductPath, readProduct } from '../../lib/product.server';
import { resolveEntityMeta } from '../../lib/data/entity-meta';
import type { EntityType, PlayerMeta, TeamMeta } from '../../lib/types';
export const GET: APIRoute = async ({ request, url, params }) => {
  const product = params.product ?? '';
  const path = profileProductPath(url, product);
  const headers = { 'Cache-Control': 'no-store' };
  if (!path) return Response.json({ error: 'Invalid product parameters' }, { status: 400, headers });
  const response = await readProduct(request, path, env);
  if (product !== 'identity' || !response.ok) return response;
  const raw = await response.json() as (PlayerMeta | TeamMeta) | null;
  return Response.json(raw ? resolveEntityMeta(raw, url.searchParams.get('sport')!, url.searchParams.get('type') as EntityType) : null, { headers });
};
