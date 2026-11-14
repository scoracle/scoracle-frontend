import { createSignal, onCleanup } from 'solid-js';
export type ProductState<T> = { status: 'pending' } | { status: 'success'; data: T } | { status: 'empty' } | { status: 'error' };

/** One instance per product owner; late and disposed requests cannot write. */
export function createProduct<T>() {
  const [state, setState] = createSignal<ProductState<T>>({ status: 'pending' });
  let controller: AbortController | undefined;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => { generation++; controller?.abort(); clearTimeout(timer); });
  async function load(url: string | null) {
    const current = ++generation;
    controller?.abort();
    clearTimeout(timer);
    if (url === null) { setState({ status: 'empty' }); return; }
    controller = new AbortController();
    setState({ status: 'pending' });
    const timeout = timer = setTimeout(() => {
      if (current === generation) { generation++; controller?.abort(); setState({ status: 'error' }); }
    }, 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Product unavailable');
      const data: T | null = await response.json();
      if (current === generation) setState(data === null ? { status: 'empty' } : { status: 'success', data });
    } catch {
      if (current === generation) setState({ status: 'error' });
    } finally { clearTimeout(timeout); }
  }
  return { state, load };
}
