import type { JSX } from 'solid-js';
import { createEffect, Show } from 'solid-js';
import { profilePath } from '../lib/utils/profile-url';
import { DEFAULT_TAB } from '../lib/utils/profile-tabs';
import type { ResolvedMeta } from '../lib/data/entity-meta';
import type { ProfilePathParts } from '../lib/utils/profile-url';
import { createProfileProducts, ProfileProductsContext } from '../lib/profile-products';
import { createProfileContext, ProfileContext } from '../lib/profile-context';
import EntityMeta from '../components/EntityMeta';
import ReadingTable from '../components/ReadingTable';
import LoadingCard from '../components/LoadingCard';
export default function ProfileExperience(props: ProfilePathParts & { identity: ResolvedMeta; initialSearch: string; details?: JSX.Element; loading?: JSX.Element }) {
  const ctx = createProfileContext(props, props.initialSearch);
  const products = createProfileProducts(props, ctx, props.identity);
  const design = import.meta.env.DEV && new URLSearchParams(props.initialSearch).get('cardBack');
  const preview = design === 'celestial';
  createEffect(() => {
    const tab = ctx.activeTab();
    const canonical = `https://scoracle.com${profilePath(props.sport, props.type, props.id, { name: props.identity.name, tab: tab === DEFAULT_TAB ? undefined : tab })}`;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical);
  });
  return <ProfileContext.Provider value={ctx}><ProfileProductsContext.Provider value={products}>
    <Show when={preview || products.resources.stats.state().status === 'pending'}>
      <LoadingCard label="Identity" class="meta-widget profile-meta-back" />
    </Show>
    <EntityMeta identity={props.identity} sport={props.sport} type={props.type} details={props.details} />
    <ReadingTable preview={preview} loading={props.loading} />
  </ProfileProductsContext.Provider></ProfileContext.Provider>;
}
