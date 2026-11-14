// Keep focus with a history entry while leaving URL and scroll ownership native.
const key = 'scoracleFocus';
const links = (href: string, className: string) => Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).filter(link => link.href === href && link.className === className);

window.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.download || (link.target && link.target !== '_self')) return;
  const destination = new URL(link.href);
  if (destination.origin !== location.origin || (destination.pathname === location.pathname && destination.search === location.search)) return;
  try {
    history.replaceState({ ...history.state, [key]: { href: link.href, className: link.className, index: links(link.href, link.className).indexOf(link) } }, '');
  } catch { /* Navigation still works if history state is unavailable. */ }
});

window.addEventListener('pageshow', event => {
  if (event.persisted || (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type !== 'back_forward') return;
  const saved = history.state?.[key];
  if (!saved || typeof saved.href !== 'string' || typeof saved.className !== 'string' || !Number.isInteger(saved.index)) return;
  const observer = new MutationObserver(restore);
  const timer = window.setTimeout(stop, 10000);
  function stop() {
    observer.disconnect();
    clearTimeout(timer);
    window.removeEventListener('pointerdown', stop, true);
    window.removeEventListener('keydown', stop, true);
    window.removeEventListener('pagehide', stop);
  }
  function restore() {
    if (document.activeElement && document.activeElement !== document.body && document.activeElement !== document.documentElement) return stop();
    const link = links(saved.href, saved.className)[saved.index];
    // Hydration replaces server-rendered nodes; wait for their owning island.
    if (!link || link.closest('astro-island[ssr]') || !link.getClientRects().length) return;
    link.focus({ preventScroll: true });
    stop();
  }
  window.addEventListener('pointerdown', stop, true);
  window.addEventListener('keydown', stop, true);
  window.addEventListener('pagehide', stop);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['ssr'] });
  restore();
});
