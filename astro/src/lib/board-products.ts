import { createRoot, createSignal, onCleanup } from 'solid-js';
import { createProduct, type ProductState } from './product.ts';
import type { BoardEntry, LeaderboardEntry, TransferLeader } from '../../../src/lib/data/leaderboard.server';
export interface BoardPayload {
  leaders?: (BoardEntry | LeaderboardEntry)[];
  rumors?: TransferLeader[];
  season?: number;
  available_seasons?: number[];
}

/** One experience owns active and warm reads, including in-flight reuse. */
export function createBoardProducts() {
  const entries = new Map<string, { product: ReturnType<typeof createProduct<BoardPayload>>; dispose: () => void }>();
  const [active, setActive] = createSignal<string>('');
  onCleanup(() => { for (const entry of entries.values()) entry.dispose(); entries.clear(); });
  function select(key: string, warm: string[]) {
    const wanted = new Set([key, ...warm]);
    for (const [url, entry] of entries) {
      if (!wanted.has(url) && entry.product.state().status === 'pending') { entry.dispose(); entries.delete(url); }
    }
    for (const url of wanted) {
      if (!entries.has(url)) {
        const entry = createRoot(dispose => ({ product: createProduct<BoardPayload>(), dispose }));
        entries.set(url, entry);
        void entry.product.load(url);
      }
    }
    setActive(key);
  }
  return {
    select,
    state: (): ProductState<BoardPayload> => entries.get(active())?.product.state() ?? { status: 'pending' },
    retry: () => { const entry = entries.get(active()); if (entry) void entry.product.load(active()); },
  };
}
