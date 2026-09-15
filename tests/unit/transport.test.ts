import { afterEach, expect, test, vi } from 'vitest';
const event = vi.hoisted(() => ({ request: new Request('http://localhost/'), locals: {}, response: { status: 200, headers: new Headers() } }));
vi.mock('@solidjs/web', () => ({ getRequestEvent: () => event }));
import { fetchJsonOrNull } from '../../src/lib/data/fetch-json.server';
const target = { url: 'http://localhost/api/v1/nba/player/177/stats', headers: {} };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); event.response.status = 200; });
test('successful response parses and receives a cancellation signal', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ actual: true })); vi.stubGlobal('fetch', fetch);
    expect(await fetchJsonOrNull(target, 'stats')).toEqual({ actual: true });
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});
test('missing product is empty, not an outage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    expect(await fetchJsonOrNull(target, 'stats')).toBeNull(); expect(event.response.status).toBe(200);
});
test.each([429, 500, 503])('HTTP %s becomes a non-cacheable failure', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
    await expect(fetchJsonOrNull(target, 'stats')).rejects.toThrow(`stats ${status}`);
    expect(event.response.status).toBe(503); expect(event.response.headers.get('Cache-Control')).toBe('no-store');
});
test('stalled response bodies hit the deadline too', async () => {
    vi.stubEnv('SCORACLE_API_TIMEOUT_MS', '20');
    vi.stubGlobal('fetch', vi.fn(async (_url, { signal }) => ({ status: 200, ok: true, headers: new Headers(),
        json: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))) })));
    await expect(fetchJsonOrNull(target, 'stats')).rejects.toThrow('timed out after 20ms');
});
