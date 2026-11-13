import { Show, ErrorBoundary, type JSX } from 'solid-js';
import { useProfileProducts, type ProductKey } from '../lib/profile-products';
import { useProfile, type ProfileTab } from '../lib/profile-context';
import { CardVessel } from './Card';
import LoadingCard from './LoadingCard';
export const deckProducts: Record<ProfileTab, ProductKey[]> = {
  profile: ['stats'], scouting: ['report'], narratives: ['news'], transfers: ['transfers'],
  vibe: ['vibe'], momentum: ['stats', 'momentum', 'summary'], sigil: ['sigil'],
};
export default function ProductPane(props: { deck: ProfileTab; label: string; children: JSX.Element }) {
  const products = useProfileProducts();
  const ctx = useProfile();
  const keys = () => props.deck === 'profile' && ctx.vs() ? [...deckProducts.profile, 'comparisonStats', 'comparisonMeta'] as ProductKey[] : deckProducts[props.deck];
  const pending = () => keys().some(key => products.resources[key].state().status === 'pending');
  const failed = () => keys().filter(key => products.resources[key].state().status === 'error');
  const failure = (retry: () => void) => <CardVessel as="article"><div class="card-band-body" role="alert"><p>{props.label} is unavailable.</p><button class="card-error-retry" onClick={retry}>Retry {props.label}</button></div></CardVessel>;
  return <ErrorBoundary fallback={(_error, reset) => failure(reset)}>
    <Show when={!pending()} fallback={<LoadingCard label={props.label} />}>
      <Show when={!failed().length} fallback={failure(() => { for (const key of failed()) void products.load(key); })}>{props.children}</Show>
    </Show>
  </ErrorBoundary>;
}
