import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { profileProductPath, readProduct } from '../../lib/product.server';
import { readIdentityMaps } from '../../lib/identity.server';
import { resolveFromMaps } from '../../../../src/lib/data/entity-meta';
import type { EntityType } from '../../../../src/lib/types';
export const GET: APIRoute = async ({ request, url, params }) => {
  const product = params.product ?? '';
  const path = profileProductPath(url, product);
  const headers = { 'Cache-Control': 'no-store' };
  if (!path) return Response.json({ error: 'Invalid product parameters' }, { status: 400, headers });
  if (product !== 'identity') return readProduct(request, path, env);
  try {
    const sport = url.searchParams.get('sport')!;
    const maps = await readIdentityMaps(env.ASSETS, new URL(`/data/${sport}-meta.json`, url));
    return Response.json(resolveFromMaps(maps, sport, url.searchParams.get('type') as EntityType, url.searchParams.get('id')!), { headers });
  } catch {
    return Response.json({ error: 'Identity unavailable' }, { status: 503, headers });
  }
};
