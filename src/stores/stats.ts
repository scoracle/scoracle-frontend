/**
 * Stats Store — cross-island reactive state for entity stats data.
 *
 * Published by StatsTab once its fetch resolves. Consumed by
 * downstream tabs (Traits) that derive their views from stats data.
 */

import { atom } from 'nanostores';
import type { EntityType } from '../lib/types';
import type { Category, BoxScoreGroup } from '../lib/utils/stats-categorizer';

export interface StatsData {
  season: number | null;
  entity: {
    id: string;
    name: string;
    type: EntityType;
  };
  categories: Category[];
  boxScoreGroups: BoxScoreGroup[];
  form?: string;
}

export const $statsData = atom<StatsData | null>(null);
