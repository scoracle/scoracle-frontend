import { createEffect } from 'solid-js';
import { profilePath } from '../../../src/lib/utils/profile-url';
import { DEFAULT_TAB } from '../../../src/lib/utils/profile-tabs';
import type { ResolvedMeta } from '../../../src/lib/data/entity-meta';
import type { ProfilePathParts } from '../../../src/lib/utils/profile-url';
import { createProfileProducts, ProfileProductsContext } from '../lib/profile-products';
import { createProfileContext, ProfileContext } from '../lib/profile-context';
import EntityMeta from '../components/EntityMeta';
import ReadingTable from '../components/ReadingTable';
import '../../../src/routes/profile.css';
export default function ProfileExperience(props: ProfilePathParts & { identity: ResolvedMeta; initialSearch: string }) {
  const ctx = createProfileContext(props, props.initialSearch);
  const products = createProfileProducts(props, ctx, props.identity);
  createEffect(() => {
    const tab = ctx.activeTab();
    const canonical = `https://scoracle.com${profilePath(props.sport, props.type, props.id, { name: props.identity.name, tab: tab === DEFAULT_TAB ? undefined : tab })}`;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical);
  });
  return <ProfileContext.Provider value={ctx}><ProfileProductsContext.Provider value={products}>
    <div class="profile-deck"><EntityMeta identity={props.identity} sport={props.sport} type={props.type} /><ReadingTable /></div>
    <noscript>Live readings require JavaScript.</noscript>
  </ProfileProductsContext.Provider></ProfileContext.Provider>;
}
