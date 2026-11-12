import { onMount, Show } from 'solid-js';
import type { VibeResponse } from '../../../src/lib/data/vibe';
import { createProduct } from '../lib/product';
import { createUrlState } from '../lib/url-state';

// shortcut: one real reading proves the runtime; complete card composition in Step 4.
export default function ProfileExperience(props: { sport: string; type: string; id: string; name: string; initialSearch: string }) {
  const vibe = createProduct<VibeResponse>();
  const url = createUrlState(props.initialSearch);
  const load = () => vibe.load(`/api/vibe?${new URLSearchParams({ sport: props.sport, type: props.type, id: props.id })}`);
  onMount(() => { void load(); });
  const reading = () => { const state = vibe.state(); return state.status === 'success' ? state.data.current : null; };
  return <section aria-label={`${props.name} readings`}>
    <button type="button" aria-pressed={new URLSearchParams(url.search()).get('tab') === 'vibe'} onClick={() => url.replace('tab', 'vibe')}>Vibe</button>
    <div aria-live="polite">
      <Show when={vibe.state().status === 'pending'}><p>Loading Vibe…</p></Show>
      <Show when={vibe.state().status === 'error'}><p>Vibe is unavailable.</p><button type="button" onClick={() => void load()}>Retry Vibe</button></Show>
      <Show when={vibe.state().status === 'empty' || (vibe.state().status === 'success' && !reading())}><p>No Vibe reading yet.</p></Show>
      <Show when={reading()}>{current => <article><h2>{current().headline}</h2><p>{current().body}</p></article>}</Show>
    </div>
    <noscript>Live readings require JavaScript.</noscript>
  </section>;
}
