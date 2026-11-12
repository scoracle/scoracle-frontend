import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRoot } from 'solid-js';
import { createProduct } from '../src/lib/product.ts';
import { readProduct, vibePath } from '../src/lib/product.server.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('transport allowlist rejects extra, duplicate and malformed parameters', () => {
  const url = (query: string) => new URL(`https://scoracle.com/api/vibe?${query}`);
  assert.equal(vibePath(url('sport=nba&type=player&id=177')), 'nba/player/177/vibe');
  for (const query of ['sport=NBA&type=player&id=177', 'sport=nba&type=player&id=-1', 'sport=nba&type=player&id=1&id=2', 'sport=nba&type=player&id=1&url=https://evil.test', 'sport=nba&type=player&id=9007199254740992']) assert.equal(vibePath(url(query)), null);
});

test('fixed origin and server credential; empty, upstream errors and malformed JSON stay distinct', async () => {
  const request = new Request('https://scoracle.com/api/vibe', { headers: { Authorization: 'browser-token', Cookie: 'private=1' } });
  let response = Response.json({ current: null });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.scoracle.com/api/v1/nba/player/177/vibe');
    const headers = new Headers(options?.headers);
    assert.equal(headers.get('X-Scoracle-Internal-Key'), 'test-only-key');
    assert.equal(headers.get('Authorization'), null);
    assert.equal(headers.get('Cookie'), null);
    return response;
  };
  const read = () => readProduct(request, 'nba/player/177/vibe', { SCORACLE_INTERNAL_KEY: 'test-only-key' });
  assert.deepEqual(await (await read()).json(), { current: null });
  response = new Response(null, { status: 404 });
  assert.equal(await (await read()).json(), null);
  response = new Response(null, { status: 429 });
  const failed = await read();
  assert.equal(failed.status, 429);
  assert.equal(failed.headers.get('Cache-Control'), 'no-store');
  response = new Response('not json');
  assert.equal((await read()).status, 502);
});

test('only poisoned cache errors retry upstream', async () => {
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    if (calls === 1) return new Response(null, { status: 503, headers: { 'CF-Cache-Status': 'HIT' } });
    assert.equal(options?.cache, 'no-store');
    return Response.json({ current: null });
  };
  assert.equal((await readProduct(new Request('https://scoracle.com'), 'nba/player/177/vibe', {})).status, 200);
  assert.equal(calls, 2);
});

test('deadline includes body consumption and incoming cancellation', async () => {
  globalThis.fetch = async (_url, options) => new Response(new ReadableStream({ start(controller) {
    options?.signal?.addEventListener('abort', () => controller.error(options.signal?.reason));
  } }));
  const timer = setTimeout(() => {}, 1000);
  try {
    assert.equal((await readProduct(new Request('https://scoracle.com'), 'nba/player/177/vibe', { SCORACLE_API_TIMEOUT_MS: '5' })).status, 504);
    const controller = new AbortController();
    const pending = readProduct(new Request('https://scoracle.com', { signal: controller.signal }), 'nba/player/177/vibe', {});
    controller.abort();
    assert.equal((await pending).status, 502);
  } finally { clearTimeout(timer); }
});

test('resource retries locally, aborts superseded reads, ignores late results and cleans up', async () => {
  const pending: { resolve: (response: Response) => void; signal: AbortSignal }[] = [];
  globalThis.fetch = (_url, options) => new Promise(resolve => pending.push({ resolve, signal: options!.signal! }));
  const { product, dispose } = createRoot(dispose => ({ product: createProduct<{ value: number }>(), dispose }));
  assert.equal(product.state().status, 'pending');
  assert.equal(pending.length, 0, 'creation must not fetch during SSR');
  const first = product.load('/api/vibe?id=1');
  const second = product.load('/api/vibe?id=2');
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve(new Response(null, { status: 503 })); await second;
  assert.equal(product.state().status, 'error');
  const retry = product.load('/api/vibe?id=2');
  pending[2].resolve(Response.json({ value: 2 })); await retry;
  pending[0].resolve(Response.json({ value: 1 })); await first;
  assert.deepEqual(product.state(), { status: 'success', data: { value: 2 } });
  const last = product.load('/api/vibe?id=3');
  dispose();
  assert.equal(pending[3].signal.aborted, true);
  pending[3].resolve(Response.json(null)); await last;
  assert.equal(product.state().status, 'pending', 'disposed request cannot write');
});

test('upstream redirects are never followed with the internal credential', async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.redirect, 'manual');
    return new Response(null, { status: 302, headers: { Location: 'https://untrusted.test' } });
  };
  const response = await readProduct(new Request('https://scoracle.com'), 'nba/player/177/vibe', { SCORACLE_INTERNAL_KEY: 'test-only-key' });
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('Location'), null);
});
