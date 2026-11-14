import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readProduct, vibePath } from '../../lib/product.server';

export const GET: APIRoute = ({ request, url }) => {
  const path = vibePath(url);
  return path ? readProduct(request, path, env) : Response.json({ error: 'Invalid product parameters' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
};
