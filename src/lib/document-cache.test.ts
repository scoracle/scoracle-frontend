// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { cacheDocument } from './document-cache';

it('isolates public documents by version and query, and reuses successful renders', async () => {
  const entries = new Map<string, Response>();
  const tasks: Promise<unknown>[] = [];
  const cache = { match: async (key: Request) => entries.get(key.url)?.clone(), put: async (key: Request, response: Response) => { entries.set(key.url, response); } } as unknown as Cache;
  const render = vi.fn(async () => new Response('document', { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=300' } }));
  const read = (version: string, search = '') => cacheDocument(new Request(`https://example.com/leaderboard${search}`), version, cache, task => tasks.push(task), render);
  expect((await read('one', '?season=2025')).headers.get('X-Edge-Cache')).toBe('miss');
  await Promise.all(tasks);
  expect((await read('one', '?season=2025')).headers.get('X-Edge-Cache')).toBe('hit');
  await read('two', '?season=2025');
  await read('one', '?season=2024');
  expect(render).toHaveBeenCalledTimes(3);
});

it('never stores errors, private responses or cookies, and bypasses APIs and credentials', async () => {
  const cache = { match: vi.fn(async () => undefined), put: vi.fn(async () => {}) } as unknown as Cache;
  for (const response of [new Response('error', { status: 500 }), new Response('private', { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/html' } }), new Response('cookie', { headers: { 'Cache-Control': 'public, max-age=300', 'Content-Type': 'text/html', 'Set-Cookie': 'test=1' } })]) {
    await cacheDocument(new Request('https://example.com/leaderboard'), 'one', cache, () => {}, async () => response);
  }
  expect(cache.put).not.toHaveBeenCalled();
  vi.mocked(cache.match).mockClear();
  for (const request of [new Request('https://example.com/api/stats'), new Request('https://example.com/leaderboard', { headers: { Cookie: 'test=1' } }), new Request('https://example.com/leaderboard', { headers: { Authorization: 'synthetic' } })]) {
    await cacheDocument(request, 'one', cache, () => {}, async () => new Response('live'));
  }
  expect(cache.match).not.toHaveBeenCalled();
});
