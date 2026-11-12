/** Fixed-origin, read-only transport. The deadline covers JSON consumption too. */
export async function readProduct(request: Request, path: string, bindings: { SCORACLE_INTERNAL_KEY?: string; SCORACLE_API_TIMEOUT_MS?: string }): Promise<Response> {
  const configured = Number(bindings.SCORACLE_API_TIMEOUT_MS ?? 12000);
  const deadline = AbortSignal.timeout(Number.isFinite(configured) && configured > 0 ? configured : 12000);
  const signal = AbortSignal.any([request.signal, deadline]);
  const headers = new Headers();
  if (bindings.SCORACLE_INTERNAL_KEY) headers.set('X-Scoracle-Internal-Key', bindings.SCORACLE_INTERNAL_KEY);
  const url = `https://api.scoracle.com/api/v1/${path}`;
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    let response = await fetch(url, { headers, signal, redirect: 'manual', cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 300, '300-599': -1 } } });
    if (!response.ok && response.status !== 404 && ['HIT', 'STALE', 'UPDATING'].includes(response.headers.get('CF-Cache-Status') ?? '')) {
      await response.body?.cancel();
      response = await fetch(url, { headers, signal, redirect: 'manual', cache: 'no-store' });
    }
    if (response.status === 404) { await response.body?.cancel(); return reply(null); }
    if (!response.ok) {
      await response.body?.cancel();
      return reply({ error: 'Product unavailable' }, response.status >= 300 && response.status < 400 ? 502 : response.status);
    }
    return reply(await response.json());
  } catch {
    console.error("[scoracle:product]", { timedOut: deadline.aborted, cancelled: request.signal.aborted });
    return reply({ error: deadline.aborted ? 'Product timed out' : 'Product unavailable' }, deadline.aborted ? 504 : 502);
  }
}

export function vibePath(url: URL): string | null {
  const { searchParams: params } = url;
  if ([...params.keys()].some(key => !['sport', 'type', 'id'].includes(key) || params.getAll(key).length !== 1)) return null;
  const sport = params.get('sport');
  const type = params.get('type');
  const id = params.get('id') ?? '';
  if (!['nba', 'nfl', 'football'].includes(sport ?? '') || !['player', 'team'].includes(type ?? '') || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return null;
  return `${sport}/${type}/${id}/vibe`;
}
