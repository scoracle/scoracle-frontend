import { describe, expect, it } from 'vitest';
import { readHomeMovers } from './home-movers';
import { parseEntities } from './parse-entities';

describe('home data shared between runtimes', () => {
  it('starts every mover read together, preserves sport order and tolerates individual failures', async () => {
    const calls: string[] = [];
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const result = readHomeMovers(['nba', 'nfl'], async (sport, metric, direction) => {
      calls.push(`${sport}/${metric}/${direction}`);
      await pending;
      if (sport === 'nfl') throw new Error('offline');
      return { leaders: [{ entity_type: 'player', id: 1, name: 'A', image: null, team_logo: null, heat: metric === 'rating' ? 0 : direction === 'up' ? 3 : -2 }] };
    });
    expect(calls).toHaveLength(8);
    expect(calls.slice(0, 4)).toEqual(['nba/vibe/up', 'nba/vibe/down', 'nba/rating/up', 'nba/rating/down']);
    release();
    expect((await result).map(mover => mover.delta)).toEqual([3, -2]);
  });
  it('keeps display names and positions while skipping invalid entities', () => {
    const entities = parseEntities([
      { entity_id: 1, name: 'Estêvão Silva', type: 'player', sport: 'football', position: 'M' },
      { id: 2, name: 'Celtics', type: 'team', sport: 'nba' },
      { id: 3, name: '', type: 'player' },
      { id: null, name: 'Missing Id', type: 'player', sport: 'nba' },
      { name: 'Undefined Id', type: 'player', sport: 'nba' },
      { id: '0', name: 'Zero Id', type: 'player', sport: 'nba' },
    ]);
    expect(entities.map(({ id, name }) => [id, name])).toEqual([['1', 'Estêvão Silva'], ['2', 'Celtics']]);
    expect(entities[0].positionGroup).toBe('midfielder');
  });
});
