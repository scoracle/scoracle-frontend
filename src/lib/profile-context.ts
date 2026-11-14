import { createContext, useContext, onMount } from 'solid-js';
import type { ProfileContextValue, ProfileTab, RatingScope, RateMode, ScoreModel } from '../contexts/profile';
import type { ProfilePathParts } from './utils/profile-url';
import { deriveInitialTab, DEFAULT_TAB } from './utils/profile-tabs';
import { createUrlState } from './url-state';
export type { ProfileContextValue, ProfileTab, RatingScope, RateMode, ScoreModel };
export const ProfileContext = createContext<ProfileContextValue>();
export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('Missing profile context');
  return value;
}
export function createProfileContext(identity: ProfilePathParts, initialSearch: string): ProfileContextValue {
  const url = createUrlState(initialSearch);
  const params = () => new URLSearchParams(url.search());
  const activeTab = () => deriveInitialTab(params().get('tab') ?? undefined, params().get('newsView') ?? params().get('newsScope') ?? undefined);
  const setActiveTab = (tab: ProfileTab) => url.replaceAll({ tab: tab === DEFAULT_TAB ? null : tab, newsView: null, newsScope: null, week: null, year: null, date: null });
  onMount(() => {
    if (['newsView', 'newsScope', 'week', 'year', 'date'].some(key => params().has(key))) setActiveTab(activeTab());
  });
  return {
    sport: () => identity.sport, type: () => identity.type, id: () => identity.id,
    activeTab, setActiveTab,
    season: () => { const n = Number(params().get('season')); return Number.isSafeInteger(n) && n > 0 ? n : null; },
    setSeason: value => url.replace('season', value == null ? null : String(value)),
    scope: () => { const value = params().get('scope'); return ['position', 'conference', 'division', 'league'].includes(value ?? '') ? value as RatingScope : 'all'; },
    setScope: value => url.replace('scope', value === 'all' ? null : value),
    rateMode: () => { const value = params().get('rate'); return ['per_36', 'per_90', 'per_game', 'per_season'].includes(value ?? '') ? value as RateMode : 'default'; },
    setRateMode: value => url.replace('rate', value === 'default' ? null : value),
    scoreModel: () => params().get('model') === 'fantasy' ? 'fantasy' : 'regular',
    setScoreModel: value => url.replace('model', value === 'regular' ? null : value),
    vs: () => { const value = params().get('vs'); return value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? value : null; },
    setVs: value => url.replace('vs', value || null),
  };
}
