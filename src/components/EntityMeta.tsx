import type { JSX } from 'solid-js';
import { For, Show, createSignal, onMount } from 'solid-js';
import { staticLogoUrl, playerTeamFromRaw, teamHref, type ResolvedMeta } from '../lib/data/entity-meta';
import type { EntityType } from '../lib/types';
import { imageUrl } from '../lib/utils/image-url';
import { CardVessel } from './Card';
import { useProfileProducts } from '../lib/profile-products';
import { useProfile } from '../lib/profile-context';
import { createDeckScoreReader } from '../lib/deck-scores';
import { META_SCORE_DECKS } from '../lib/cards/meta-score-layout';
import { tierColor, tierColorScore } from '../lib/utils/tier-color';
import { MetaScoreSlot } from './MetaScoreRing';
import './EntityMeta.css';

export default function EntityMeta(props: { identity: ResolvedMeta; sport: string; type: EntityType; details?: JSX.Element; revealing?: boolean }) {
  const products = useProfileProducts();
  const data = products.reads;
  const ctx = useProfile();
  const score = createDeckScoreReader(ctx, data, "scouting");
  const rating = () => { const n = score(); return n == null || !Number.isFinite(n) ? null : Math.round(n); };
  const logo = () => staticLogoUrl(props.identity, props.type);
  const team = () => props.type === 'player' ? (data.stats()?.rating?.team ?? playerTeamFromRaw(props.identity)) : null;
  const [failed, setFailed] = createSignal(false);
  let image: HTMLImageElement | undefined;
  onMount(() => { if (image?.complete && image.naturalWidth === 0) setFailed(true); });
  return <CardVessel class="meta-widget" classList={{ 'card-turn-in': !!props.revealing }} title={props.identity.name} aria-label="Entity">
    <div class="pw-body"><div class="pw-content">
      <div class="pw-meta-head" aria-label={rating() == null ? "Rating not yet read" : `Rating ${rating()}`}><Show when={rating() != null} fallback={<span class="pw-meta-head-value pw-score-unclear">—</span>}><span class="pw-meta-head-value" style={{ color: props.type === "team" ? tierColor(rating()!) : tierColorScore(rating()!) }}>{rating()}</span></Show></div>
      <Show when={team()} fallback={<p class="card-eyebrow pw-subtitle">{props.identity.subtitle}</p>}>
        {value => <p class="card-eyebrow pw-subtitle"><a class="pw-subtitle-link" href={teamHref(props.sport, value().id, value().name)}>{value().name}</a></p>}
      </Show>
      <div class="pw-ring">
        <div class="pw-ring-crest" classList={{ 'pw-ring-headshot': props.type === 'player' && !!props.identity.photoUrl && logo() === props.identity.photoUrl }}>
          <Show when={logo() && !failed()} fallback={<span class="pw-crest-mono" aria-hidden="true">{props.identity.name.charAt(0)}</span>}>
            <img ref={image} src={imageUrl(logo(), 384)} alt={props.identity.name} loading="eager" fetchpriority="high" onError={() => setFailed(true)} />
          </Show>
        </div>
        <Show when={products.settled()}><For each={META_SCORE_DECKS}>{deck => { const value = createDeckScoreReader(ctx, data, deck); return <MetaScoreSlot deck={deck} value={value()} sport={props.sport} type={props.type} />; }}</For></Show>
      </div>
      {props.details}
    </div></div>
  </CardVessel>;
}
