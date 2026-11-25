import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { autofillPath, readProduct } from '../../lib/product.server';

export const GET: APIRoute = async ({ request, url }) => {
  const path = autofillPath(url);
  if (!path) return Response.json({ error: 'Invalid autofill parameters' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  return readProduct(request, path, env);
};
