import { boardSource, boardQuery } from './utils/board-query.ts';

/** Public board reads accept canonical keys only, never a target URL. */
export function boardPath(url: URL): string | null {
  const p = url.searchParams;
  const allowed = ['sport', 'board', 'type', 'metric', 'season', 'rate', 'leagueId', 'teamId', 'conference', 'division', 'positionGroup'];
  if ([...p.keys()].some(key => !allowed.includes(key) || p.getAll(key).length !== 1)) return null;
  if (!['nba', 'nfl', 'football'].includes(p.get('sport') ?? '') || !['rating', 'fantasy', 'vibes', 'momentum', 'sigil', 'news', 'transfers'].includes(p.get('board') ?? '')) return null;
  for (const key of ['season', 'leagueId', 'teamId']) {
    if (p.has(key) && (!/^[1-9]\d*$/.test(p.get(key)!) || !Number.isSafeInteger(Number(p.get(key))))) return null;
  }
  for (const key of ['conference', 'division', 'positionGroup']) {
    if (p.has(key) && (!p.get(key)!.trim() || p.get(key)!.length > 100 || /[\x00-\x1f\x7f]/.test(p.get(key)!))) return null;
  }
  const source = boardSource(key => p.get(key) ?? undefined);
  const normalized = new URLSearchParams(boardQuery(source));
  if (p.size !== normalized.size || [...p].some(([key, value]) => normalized.get(key) !== value)) return null;
  const board = source.board();
  const query = new URLSearchParams();
  if (board === 'momentum') query.set('metric', source.metric());
  if (board !== 'transfers') query.set('entity_type', source.entityType());
  if (board === 'rating' || board === 'fantasy') query.set('scope', board === 'rating' ? 'composite' : 'fantasy');
  if (normalized.has('season')) query.set('season', normalized.get('season')!);
  query.set('limit', '50');
  for (const [key, upstream] of Object.entries({ leagueId: 'league_id', teamId: 'team_id', positionGroup: 'position_group', conference: 'conference', division: 'division', rate: 'rate' })) {
    if (normalized.has(key)) query.set(upstream, normalized.get(key)!);
  }
  return `${source.sport()}/leaderboard${board === 'rating' || board === 'fantasy' ? '' : `/${board}`}?${query}`;
}
