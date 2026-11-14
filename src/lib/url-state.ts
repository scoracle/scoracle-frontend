import { createSignal, onCleanup, onMount } from 'solid-js';

export function createUrlState(initialSearch: string) {
  const [search, setSearch] = createSignal(initialSearch);
  onMount(() => {
    const restore = () => setSearch(location.search);
    restore();
    window.addEventListener('popstate', restore);
    onCleanup(() => window.removeEventListener('popstate', restore));
  });
  function replaceAll(values: Record<string, string | null>) {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value === null) url.searchParams.delete(key); else url.searchParams.set(key, value);
    }
    history.replaceState(history.state, '', url);
    setSearch(url.search);
  }
  return { search, replaceAll, replace: (key: string, value: string | null) => replaceAll({ [key]: value }) };
}
