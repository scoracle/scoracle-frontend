// Pass this function and a frozen /api/{product} response map to DevTools
// navigate_page.initScript before loading a profile. Diagnostic only: mocks
// browser reads, not legacy SSR, transport throughput, or edge caching.
function observeProfileArrival(products) {
  const result = window.__profileArrival = { requests: [], marks: {}, shifts: [], rings: [] };
  const fetchOriginal = window.fetch;
  const keys = ['stats', 'report', 'news', 'transfers', 'vibe', 'momentum', 'summary', 'sigil'];
  window.fetch = async (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    const key = url.pathname.slice('/api/'.length);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/') || !keys.includes(key)) {
      return fetchOriginal(input, options);
    }
    if (!Object.hasOwn(products, key)) throw new Error(`Missing frozen product: ${key}`);
    result.requests.push({ key, start: performance.now() });
    // Deliberately separate arrivals to expose redistribution; this is not API latency.
    await new Promise(resolve => setTimeout(resolve, 150 + keys.indexOf(key) * 120));
    const signal = options?.signal ?? (input instanceof Request ? input.signal : undefined);
    signal?.throwIfAborted();
    return Response.json(products[key]);
  };
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) result.shifts.push({
        time: entry.startTime, value: entry.value,
        sources: entry.sources.map(source => ({
          className: source.node?.className ?? null,
          before: source.previousRect.toJSON(), after: source.currentRect.toJSON(),
        })),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) result.marks.lcp = entry.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  let lastRing = '';
  const check = () => {
    const slots = [...document.querySelectorAll('.pw-ring-slot')];
    const ring = slots.map(slot => slot.dataset.deck).join(',');
    if (ring !== lastRing) {
      result.rings.push({ time: performance.now(), decks: ring, positions: slots.map(slot => {
        const rect = slot.getBoundingClientRect();
        return { deck: slot.dataset.deck, x: rect.x, y: rect.y };
      }) });
      lastRing = ring;
    }
    const mark = (key, element) => {
      if (!element || result.marks[key] != null) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || element.closest('[inert]')) return;
      result.marks[key] = performance.now();
      // A rendering opportunity, explicitly not a measured paint timestamp.
      requestAnimationFrame(() => { result.marks[`${key}Frame`] = performance.now(); });
    };
    mark('productDOM', document.querySelector('.reading-table-pane.active .pizza-chart-svg, .reading-table-pane.active .vibe-card'));
    mark('deckDOM', document.querySelector('[role=tablist][aria-label="Profile section"] [role=tab]'));
  };
  new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true });
  document.addEventListener('DOMContentLoaded', check);
}
