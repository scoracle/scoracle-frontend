import { expect, test } from '@playwright/test';
test.skip(process.env.SCORACLE_TEST_WORKERS !== '1', 'Cloudflare host contract');
test('anonymous public documents cache; cookies, errors and redirects do not', async ({ playwright }) => {
  const client = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:4314', extraHTTPHeaders: {} });
  const fault = (data: object) => client.post('http://127.0.0.1:18001/__test', { data });
  try {
    await fault({});
    const path = `/profile/nba/player/177-aaron-gordon?cache_check=${Date.now()}`;
    const first = await client.get(path); expect(first.status()).toBe(200);
    expect(first.headers()['x-edge-cache']).toBe('miss');
    const html = await first.text();
    expect(html).not.toContain('local-verification-key');
    expect(html).not.toContain('noindex');
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head.match(/<title(?:\s|>)/g)).toHaveLength(1);
    expect(head).toContain('Aaron Gordon'); expect(head).toContain('brand-unfurl.png');
    expect(first.headers()['content-security-policy']).toContain("object-src 'none'");
    await expect.poll(async () => (await client.get(path)).headers()['x-edge-cache']).toBe('hit');
    const personal = await client.get(path, { headers: { Cookie: 'preference=1' } });
    expect(personal.headers()['x-edge-cache']).toBeUndefined();
    const auth = await client.get(path, { headers: { Authorization: 'Bearer fixture' } });
    expect(auth.headers()['x-edge-cache']).toBeUndefined();
    const legacy = await client.get('/profile?sport=NBA&type=player&id=177', { maxRedirects: 0 });
    expect(legacy.status()).toBe(301); expect(legacy.headers()['x-edge-cache']).not.toBe('hit');
    await fault({ match: '/177/stats', status: 503 });
    const failurePath = `${path}&failure=1`;
    const failure = await client.get(failurePath);
    expect(failure.status()).toBe(503); expect(failure.headers()['cache-control']).toBe('no-store');
    expect(await failure.text()).toContain('stats 503');
    await fault({});
    const recovered = await client.get(failurePath); expect(recovered.status()).toBe(200);
    expect(recovered.headers()['x-edge-cache']).toBe('miss');
    const log = await (await client.get('http://127.0.0.1:18001/__test')).json();
    expect(log.requests.length).toBeGreaterThan(0);
    expect(log.requests.every((r: { internal: boolean }) => r.internal)).toBe(true);
  } finally { await fault({}); await client.dispose(); }
});
