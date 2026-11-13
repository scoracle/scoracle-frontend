import { onMount, Show } from 'solid-js';
import type { ResolvedMeta } from '../../../src/lib/data/entity-meta';
import type { ProfilePathParts } from '../../../src/lib/utils/profile-url';
import { createProfileProducts } from '../lib/profile-products';
import { createUrlState } from '../lib/url-state';
import EntityMeta from '../components/EntityMeta';
import VibeCard from '../components/VibeCard';
import LoadingCard from '../components/LoadingCard';
import { CardVessel } from '../components/Card';
import NavWell from '../components/NavWell';
import '../../../src/routes/profile.css';
import '../../../src/components/solid/ReadingTable.css';

const items = [{ id: 'vibe', label: 'Vibe' }];
// shortcut: D1 ports Vibe only; D2 adds the remaining owners and full deck navigation.
export default function ProfileExperience(props: ProfilePathParts & { identity: ResolvedMeta; initialSearch: string }) {
  const reads = createProfileProducts({ sport: props.sport, type: props.type, id: props.id });
  const url = createUrlState(props.initialSearch);
  onMount(() => { void reads.loadVibe(); });
  return <>
    <div class="profile-deck">
      <EntityMeta identity={props.identity} sport={props.sport} type={props.type} vibeScore={reads.vibeScore()} />
      <div class="reading-table" aria-label={`${props.identity.name} readings`}>
        <Show when={reads.hasVibe()}><NavWell items={items} active="vibe" onSelect={() => url.replace('tab', 'vibe')} ariaLabel="Cards" /></Show>
        <Show when={reads.vibe.state().status === 'pending' || reads.hasVibe()}>
          <div class="reading-table-deck"><div class="deck-stage"><div class="reading-table-panes">
            <Show when={reads.vibe.state().status !== 'pending'} fallback={<LoadingCard label="Reading" />}>
              <Show when={reads.vibe.state().status !== 'error'} fallback={
                <CardVessel as="article" aria-label="Vibe unavailable"><div class="card-band-body" role="alert">
                  <p>Vibe is unavailable.</p><button class="card-error-retry" type="button" onClick={() => void reads.loadVibe()}>Retry Vibe</button>
                </div></CardVessel>
              }>
                <Show when={reads.current()}>{current => <VibeCard current={current()} score={reads.vibeScore()} type={props.type} />}</Show>
              </Show>
            </Show>
          </div></div></div>
        </Show>
      </div>
    </div>
    <noscript>Live readings require JavaScript.</noscript>
  </>;
}
