import { For, Show, createSignal, onMount } from 'solid-js';
import { staticLogoUrl, playerTeamFromRaw, teamHref, type ResolvedMeta } from '../../../src/lib/data/entity-meta';
import type { EntityType } from '../../../src/lib/types';
import { imageUrl } from '../../../src/lib/utils/image-url';
import { CardVessel } from './Card';
import { MetaScoreSlot } from './MetaScoreRing';
import '../../../src/components/solid/EntityMeta.css';

export default function EntityMeta(props: { identity: ResolvedMeta; sport: string; type: EntityType; vibeScore: number | null }) {
  const logo = () => staticLogoUrl(props.identity, props.type);
  const team = () => props.type === 'player' ? playerTeamFromRaw(props.identity) : null;
  const [failed, setFailed] = createSignal(false);
  let image: HTMLImageElement | undefined;
  onMount(() => { if (image?.complete && image.naturalWidth === 0) setFailed(true); });
  return <CardVessel class="meta-widget" title={props.identity.name} aria-label="Entity">
    <div class="pw-body"><div class="pw-content">
      {/* shortcut: the rating head and season-aware team arrive with Stats in D2. */}
      <div class="pw-meta-head" aria-label="Rating not yet read"><span class="pw-meta-head-value pw-score-unclear">—</span></div>
      <Show when={team()} fallback={<p class="card-eyebrow pw-subtitle">{props.identity.subtitle}</p>}>
        {value => <p class="card-eyebrow pw-subtitle"><a class="pw-subtitle-link" href={teamHref(props.sport, value().id, value().name)}>{value().name}</a></p>}
      </Show>
      <div class="pw-ring">
        <div class="pw-ring-crest" classList={{ 'pw-ring-headshot': props.type === 'player' && !!props.identity.photoUrl && logo() === props.identity.photoUrl }}>
          <Show when={logo() && !failed()} fallback={<span class="pw-crest-mono" aria-hidden="true">{props.identity.name.charAt(0)}</span>}>
            <img ref={image} src={imageUrl(logo(), 384)} alt={props.identity.name} loading="eager" fetchpriority="high" onError={() => setFailed(true)} />
          </Show>
        </div>
        <MetaScoreSlot deck="vibe" value={props.vibeScore} sport={props.sport} type={props.type} />
      </div>
      <div class="pw-details"><For each={props.identity.details.slice(0, 6)}>{detail =>
        <div class="pw-detail-item"><span class="card-micro-eyebrow pw-detail-label">{detail.label}</span><span class="pw-detail-value">{detail.value}</span></div>
      }</For></div>
    </div></div>
  </CardVessel>;
}
