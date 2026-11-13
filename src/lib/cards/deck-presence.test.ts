import { describe, expect, it } from 'vitest';
import { hasDeckContent, type ProfileResults } from './deck-presence';
import type { ProfileTab } from '../../contexts/profile';
const cards: ProfileTab[] = ['profile', 'scouting', 'narratives', 'transfers', 'vibe', 'momentum', 'sigil'];
describe('shared profile membership', () => {
  it('empty data deals no cards', () => {
    for (const card of cards) expect(hasDeckContent({}, 'default', card)).toBe(false);
  });
  it('preserves current-without-score Vibe, zero Sigil and each independent Momentum source', () => {
    const fixture = (value: unknown) => value as ProfileResults;
    expect(hasDeckContent(fixture({ vibe: { current: { heat: null } } }), 'default', 'vibe')).toBe(true);
    expect(hasDeckContent(fixture({ sigil: { current: { heat: 0 } } }), 'default', 'sigil')).toBe(true);
    expect(hasDeckContent(fixture({ sigil: { current: { heat: null } } }), 'default', 'sigil')).toBe(false);
    for (const value of [{ stats: { rating: {}, events: [{ rating_pct: 0 }] } }, { momentum: { entity_season_sentiment_series: [{}] } }, { summary: { summary: { heat: 0 } } }]) expect(hasDeckContent(fixture(value), 'default', 'momentum')).toBe(true);
    expect(hasDeckContent(fixture({ report: { commentary: { body: '' } } }), 'default', 'scouting')).toBe(true);
    expect(hasDeckContent(fixture({ transfers: { headline: 'Quiet wire' } }), 'default', 'transfers')).toBe(true);
  });
});
