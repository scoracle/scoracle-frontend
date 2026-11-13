import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRoot } from 'solid-js';
import { boardSource, boardQuery, boardCanonical } from '../../src/lib/utils/board-query.ts';
import { boardPath } from '../src/lib/board.server.ts';
import { createBoardProducts } from '../src/lib/board-products.ts';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const source = (query: string) => boardSource(key => new URLSearchParams(query).get(key) ?? undefined);
const endpoint = (query: string) => `/api/board?${boardQuery(source(query))}`;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('board aliases, canonical URLs and effective keys retain endpoint-specific scopes', () => {
  for (const [alias, board] of Object.entries({ composite: 'rating', scouting: 'rating', trending: 'momentum', narratives: 'news' })) assert.equal(source(`board=${alias}`).board(), board);
  assert.equal(source('sport=invalid').sport(), 'nba');
  assert.equal(source('sport=football&board=fantasy').board(), 'fantasy');
  assert.equal(source('teamId=2.5').teamId(), null);
  assert.equal(boardCanonical(source('sport=NFL&board=trending&type=team&teamId=8')), 'https://scoracle.com/leaderboard?sport=NFL&board=momentum&type=team');
  assert.equal(endpoint('board=transfers&type=team&season=2025&leagueId=1&teamId=8&positionGroup=F'), '/api/board?sport=nba&board=transfers&teamId=8');
  assert.equal(endpoint('board=news&season=2025&rate=per_36&metric=rating'), endpoint('board=news'));
  assert.equal(endpoint('board=fantasy&type=team'), endpoint('board=fantasy&type=player'));
  assert.equal(endpoint('board=rating&type=team&positionGroup=F&rate=per_36'), '/api/board?sport=nba&board=rating&type=team');
});

test('board transport validates each key and preserves upstream contracts', () => {
  const path = (query: string) => boardPath(new URL(`https://test/api/board?${query}`));
  assert.equal(path('sport=nba&board=rating&type=player&season=2025&teamId=8&rate=per_36'), 'nba/leaderboard?entity_type=player&scope=composite&season=2025&limit=50&team_id=8&rate=per_36');
  assert.equal(path('sport=nfl&board=momentum&type=team&metric=rating&conference=AFC'), 'nfl/leaderboard/momentum?metric=rating&entity_type=team&limit=50&conference=AFC');
  assert.equal(path('sport=football&board=transfers&teamId=33'), 'football/leaderboard/transfers?limit=50&team_id=33');
  for (const extra of ['&url=https://evil.test', '&type=team', '&season=-1', '&season=1.1', '&season=9007199254740992', '&metric=bad', '&rate=bad', '&division=%00', '&leagueId=0']) assert.equal(path(`sport=nba&board=rating&type=player${extra}`), null);
  for (const query of ['sport=nba&board=__proto__', 'sport=nba&board=transfers&type=player', 'sport=nba&board=news&type=player&season=2025', 'sport=NBA&board=rating&type=player']) assert.equal(path(query), null);
});

test('active boards do not await warms; pending and completed keys reuse, retry is local, stale/disposed work cannot write', async () => {
  const calls: { url: string; signal: AbortSignal; resolve: (response: Response) => void }[] = [];
  globalThis.fetch = (url, options) => new Promise(resolve => calls.push({ url: String(url), signal: options!.signal!, resolve }));
  const { products, dispose } = createRoot(dispose => ({ products: createBoardProducts(), dispose }));
  const rating = endpoint(''); const news = endpoint('board=news'); const scope = endpoint('teamId=8'); const next = endpoint('teamId=9');
  try {
    assert.equal(calls.length, 0);
    products.select(rating, [rating, news]);
    assert.equal(calls.length, 2);
    calls[0].resolve(Response.json({ leaders: [{ name: 'Ready', rating_score: 0 }] })); await tick();
    assert.equal(products.state().status, 'success');
    products.select(news, [rating, news]);
    assert.equal(calls.length, 2, 'reuse pending warm');
    assert.equal(products.state().status, 'pending');
    calls[1].resolve(new Response(null, { status: 503 })); await tick();
    assert.equal(products.state().status, 'error');
    products.retry(); assert.equal(calls.length, 3);
    calls[2].resolve(Response.json({ leaders: [] })); await tick();
    assert.deepEqual(products.state(), { status: 'success', data: { leaders: [] } });
    products.select(rating, [rating, news]); assert.equal(calls.length, 3, 'reuse completed warm');
    products.select(scope, [rating, news]); products.select(next, [rating, news]);
    assert.equal(calls[3].signal.aborted, true);
    calls[4].resolve(Response.json({ leaders: [{ name: 'Current' }] })); await tick();
    calls[3].resolve(Response.json({ leaders: [{ name: 'Stale' }] })); await tick();
    assert.deepEqual(products.state(), { status: 'success', data: { leaders: [{ name: 'Current' }] } });
    products.select(scope, []); dispose();
    assert.equal(calls[5].signal.aborted, true);
    calls[5].resolve(Response.json({ leaders: [{ name: 'Disposed' }] })); await tick();
    assert.equal(products.state().status, 'pending');
  } finally { dispose(); }
});

test('board sport has no server writes and subscribes safely before or after publication', async () => {
  const { publishBoardSport, subscribeBoardSport } = await import('../src/lib/board-sport.ts');
  publishBoardSport('football');
  const target = globalThis as typeof globalThis & { window?: unknown };
  target.window = {};
  try {
    const before: string[] = []; const after: string[] = [];
    const stopBefore = subscribeBoardSport(value => before.push(value));
    assert.deepEqual(before, [], 'server publication must not persist');
    publishBoardSport('nfl');
    const stopAfter = subscribeBoardSport(value => after.push(value));
    assert.deepEqual(before, ['nfl']); assert.deepEqual(after, ['nfl']);
    stopBefore(); publishBoardSport('nba');
    assert.deepEqual(before, ['nfl']); assert.deepEqual(after, ['nfl', 'nba']);
    stopAfter();
  } finally { delete target.window; }
});
