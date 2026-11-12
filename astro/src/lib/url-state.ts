import { createSignal, onCleanup, onMount } from 'solid-js';

export function createUrlState(initialSearch: string) {
  const [search, setSearch] = createSignal(initialSearch);
  onMount(() => {
    const restore = () => setSearch(location.search);
    restore();
    window.addEventListener('popstate', restore);
    onCleanup(() => window.removeEventListener('popstate', restore));
  });
  function replace(key: string, value: string | null) {
    const url = new URL(location.href);
    if (value === null) url.searchParams.delete(key); else url.searchParams.set(key, value);
    history.replaceState(history.state, '', url);
    setSearch(url.search);
  }
  return { search, replace };
}
