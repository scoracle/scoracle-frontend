/**
 * Entity Store — cross-island reactive state for the current profile entity
 *
 * Published by EntityMeta on hydration. Consumed by any island that needs
 * to know the current entity (sport, type, id, name, position).
 */

import { atom } from 'nanostores';
import type { EntityType } from '../lib/types';

export interface EntityInfo {
  sport: string;
  type: EntityType;
  id: string;
  name: string;
  position?: string;
  positionGroup?: string;
}

export const $entityInfo = atom<EntityInfo | null>(null);

export function setEntityInfo(info: EntityInfo) {
  $entityInfo.set(info);
}
