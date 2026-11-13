async () => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const until = async (predicate, message) => {
    for (let i = 0; i < 100; i++) { if (predicate()) return; await sleep(50); }
    throw new Error(message);
  };
  const originalFetch = window.fetch;
  const calls = [];
  let failOptions = true;
  let failBoard = true;
  const row = name => ({ id: 177, name, entity_type: 'player', rank: 1, image: null, team_logo: null, heat: 0, rating_score: 0, rating_rank: 0, headline: 'Fixture' });
  window.fetch = async (input, options) => {
    const url = new URL(String(input), location.href);
    if (!url.pathname.startsWith('/api/board')) return originalFetch(input, options);
    const call = { url: url.pathname + url.search, aborted: false };
    calls.push(call);
    options?.signal?.addEventListener('abort', () => { call.aborted = true; });
    if (url.pathname === '/api/board-options') {
      await sleep(500);
      if (failOptions) return new Response(null, { status: 503 });
      return Response.json({ teams: [], positions: [] });
    }
    const p = url.searchParams;
    if (p.get('teamId') === '900001') await sleep(800);
    if (p.get('teamId') === '900004') await sleep(16000);
    if (p.get('board') !== 'rating') await sleep(1200);
    if (p.get('teamId') === '900003' && failBoard) return new Response(null, { status: 503 });
    if (p.get('teamId') === '900005') return Response.json(null);
    return Response.json({ leaders: [row(p.get('teamId') ?? 'Default')], season: 2025, available_seasons: [2025, 2024] });
  };
  const change = query => {
    history.replaceState({ ...history.state, boardTest: true }, '', `/leaderboard?${query}`);
    dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  };
  const content = () => document.querySelector('.board')?.textContent ?? '';
  const baseline = 'sport=football';
  try {
    change(baseline);
    await until(() => content().includes('Default'), 'active board waited for warming/options');
    assert(calls.length === 6, 'one options and five unique boards');
    assert(!document.querySelector('[role=alert]'), 'options should still be pending');
    await until(() => document.querySelector('[role=alert]')?.textContent.includes('controls'), 'options failure not local');
    assert(content().includes('Default'), 'options failure hid active board');
    failOptions = false;
    [...document.querySelectorAll('button')].find(e => e.textContent === 'Retry controls').click();
    await sleep(600);
    assert(!document.querySelector('[role=alert]'), 'options retry');
    assert(calls.filter(c => c.url.startsWith('/api/board?')).length === 5, 'options retry fetched boards');
    change(`${baseline}&board=news`);
    await until(() => content().includes('Default'), 'warm result not available');
    assert(calls.length === 7, 'warm selection duplicated read');
    change(`${baseline}&teamId=900001`);
    change(`${baseline}&teamId=900002`);
    await until(() => content().includes('900002'), 'new scope');
    await sleep(900);
    assert(content().includes('900002') && !content().includes('900001'), 'late scope overwrote current rows');
    assert(calls.find(c => c.url.includes('900001')).aborted, 'superseded scope not aborted');
    change(`${baseline}&teamId=900003`);
    await until(() => document.querySelector('[aria-label="Board unavailable"]'), 'board error missing');
    const before = calls.length;
    failBoard = false;
    document.querySelector('.board-retry').click();
    await until(() => content().includes('900003'), 'board retry');
    assert(calls.length === before + 1, 'board retry not local');
    assert(document.querySelector('.lb-metric').textContent === '0.0', 'zero lost');
    change(`${baseline}&teamId=900005`);
    await until(() => document.querySelector('[aria-label="No leaderboard entries"]'), 'empty not distinct');
    assert(!document.querySelector('[role=alert]'), 'empty rendered error');
    change(`${baseline}&teamId=900004`);
    await sleep(15200);
    assert(document.querySelector('[aria-label="Board unavailable"]'), 'browser deadline did not settle');
    assert(calls.find(c => c.url.includes('900004')).aborted, 'deadline did not abort');
    await sleep(1000);
    assert(document.querySelector('[aria-label="Board unavailable"]'), 'late timeout result wrote');
    change(`${baseline}&teamId=900001`);
    const island = document.querySelector('astro-island[component-url*="LeaderboardExplorer"]');
    island.dispatchEvent(new CustomEvent('astro:unmount'));
    assert(calls.at(-1).aborted, 'unmount did not abort');
    assert(history.state.boardTest, 'history fields erased');
    return { passed: ['independent active/options/warm', 'local options retry', 'warm reuse', 'stale scope and abort', 'local board retry', 'zero', 'empty', 'browser deadline', 'late timeout', 'unmount', 'history fields'], requests: calls };
  } finally { window.fetch = originalFetch; }
}
