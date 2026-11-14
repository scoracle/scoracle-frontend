import { createContext, useContext, createMemo, createEffect, on, onMount } from 'solid-js';
import type { ProfileContextValue } from './profile-context';
import type { ResolvedMeta } from './data/entity-meta';
import type { StatsResponse } from './data/stats';
import type { RatingResponse } from './data/rating';
import type { NewsResponse } from './data/news';
import type { TransfersResponse } from './data/transfers';
import type { VibeResponse } from './data/vibe';
import type { MomentumResponse } from './data/momentum';
import type { MomentumSummaryResponse } from './data/momentum-summary';
import type { SigilResponse } from './data/sigil';
import type { TeamMeta } from './types';
import type { parseEntities } from './data/parse-entities';
import { createProduct } from './product.ts';

export function createProfileProducts(identity: { sport: string; type: string; id: string }, ctx?: ProfileContextValue, meta?: ResolvedMeta) {
  const resources = {
    stats: createProduct<StatsResponse>(), report: createProduct<RatingResponse>(),
    news: createProduct<NewsResponse>(), transfers: createProduct<TransfersResponse>(),
    vibe: createProduct<VibeResponse>(), momentum: createProduct<MomentumResponse>(),
    summary: createProduct<MomentumSummaryResponse>(), sigil: createProduct<SigilResponse>(),
    comparisonStats: createProduct<StatsResponse>(), comparisonMeta: createProduct<ResolvedMeta>(),
  };
  const directory = createProduct<{ entities: Parameters<typeof parseEntities>[0] }>();
  const teams = createProduct<Record<string, TeamMeta>>();
  let searchStarted = false;
  function loadSearch(retry = false) {
    if (searchStarted && !retry) return;
    searchStarted = true;
    if (!retry || directory.state().status === 'error') void directory.load(`/data/${identity.sport}.json?v=${__DATA_VERSION__}`);
    if (!retry || teams.state().status === 'error') void teams.load(`/api/teams?sport=${identity.sport}`);
  }
  type Key = keyof typeof resources;
  const primary: Key[] = ['stats', 'report', 'news', 'transfers', 'vibe', 'momentum', 'summary', 'sigil'];
  const seasonal: Key[] = ['stats', 'report', 'momentum', 'summary', 'comparisonStats'];
  function load(key: Key) {
    const comparison = key === 'comparisonStats' || key === 'comparisonMeta';
    if (comparison && !ctx?.vs()) return resources[key].load(null);
    const query = new URLSearchParams({ sport: identity.sport, type: identity.type, id: comparison ? ctx!.vs()! : identity.id });
    if (seasonal.includes(key) && ctx?.season() != null) query.set('season', String(ctx.season()));
    const endpoint = key === 'comparisonStats' ? 'stats' : key === 'comparisonMeta' ? 'identity' : key;
    return resources[key].load(`/api/${endpoint}?${query}`);
  }
  const read = <K extends Key>(key: K) => {
    const state = resources[key].state();
    return state.status === 'success' ? state.data : null;
  };
  const reads = {
    meta: () => meta ?? null,
    stats: () => read('stats') as StatsResponse | null,
    report: () => read('report') as RatingResponse | null,
    news: () => read('news') as NewsResponse | null,
    transfers: () => read('transfers') as TransfersResponse | null,
    vibe: () => read('vibe') as VibeResponse | null,
    momentum: () => read('momentum') as MomentumResponse | null,
    summary: () => read('summary') as MomentumSummaryResponse | null,
    sigil: () => read('sigil') as SigilResponse | null,
    comparisonStats: () => read('comparisonStats') as StatsResponse | null,
    comparisonMeta: () => read('comparisonMeta') as ResolvedMeta | null,
  };
  if (ctx) {
    onMount(() => { for (const key of primary) void load(key); void load('comparisonStats'); void load('comparisonMeta'); });
    const season = createMemo(ctx.season);
    const vs = createMemo(ctx.vs);
    createEffect(on(season, () => { for (const key of seasonal.filter(key => key !== 'comparisonStats')) void load(key); }, { defer: true }));
    const comparisonKey = createMemo(() => `${vs() ?? ''}|${season() ?? ''}`);
    createEffect(on(comparisonKey, () => { void load('comparisonStats'); }, { defer: true }));
    createEffect(on(vs, () => { void load('comparisonMeta'); }, { defer: true }));
  }
  const current = () => reads.vibe()?.current ?? null;
  return { directory, teams, loadSearch, resources, reads, load, primary, settled: () => primary.every(key => resources[key].state().status !== 'pending'),
    vibe: resources.vibe, loadVibe: () => load('vibe'), current,
    vibeScore: () => current()?.heat ?? null, hasVibe: () => resources.vibe.state().status === 'error' || current() != null };
}
export type ProfileProducts = ReturnType<typeof createProfileProducts>;
export type ProfileReads = ProfileProducts['reads'];
export type ProductKey = keyof ProfileProducts['resources'];
export const ProfileProductsContext = createContext<ProfileProducts>();
export function useProfileProducts() {
  const value = useContext(ProfileProductsContext);
  if (!value) throw new Error('Missing profile products');
  return value;
}
export function useProfileReads() { return useProfileProducts().reads; }
export function useProfileRead<K extends keyof ProfileReads>(key: K): ProfileReads[K] { return useProfileReads()[key]; }
