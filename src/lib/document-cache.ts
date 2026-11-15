/** Versioned public HTML only; product APIs and credentialed requests stay live. */
export async function cacheDocument(request: Request, version: string | undefined, cache: Cache, waitUntil: (task: Promise<unknown>) => void, render: () => Promise<Response>) {
  const url = new URL(request.url);
  if (!version || request.method !== 'GET' || request.headers.has('Cookie') || request.headers.has('Authorization') || !(url.pathname.startsWith('/profile/') || url.pathname === '/leaderboard')) return render();
  url.pathname = `/${version}${url.pathname}`;
  url.searchParams.sort();
  const key = new Request(url);
  const hit = await cache.match(key);
  const response = hit ?? await render();
  if (!hit && response.status === 200 && !response.headers.has('Set-Cookie') && response.headers.get('Cache-Control')?.startsWith('public,') && response.headers.get('Content-Type')?.includes('text/html')) {
    waitUntil(cache.put(key, response.clone()).catch(() => { console.error('[scoracle:document-cache] write failed'); }));
  }
  const output = new Response(response.body, response);
  output.headers.set('X-Edge-Cache', hit ? 'hit' : 'miss');
  return output;
}
