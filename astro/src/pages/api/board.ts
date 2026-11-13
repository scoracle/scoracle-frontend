import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { boardPath } from '../../lib/board.server';
import { readProduct } from '../../lib/product.server';
export const GET: APIRoute = ({ request, url }) => {
  const path = boardPath(url);
  return path ? readProduct(request, path, env) : Response.json({ error: 'Invalid board' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
};
