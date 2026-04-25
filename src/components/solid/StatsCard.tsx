/**
 * StatsCard — Stats content card with tabbed interface (Solid.js)
 *
 * Composes TabContainer with StatsTab, TraitsTab, and CompareTab.
 * Each tab receives a reactive isActive accessor from TabContainer.
 */

import TabContainer, { type TabDef } from './TabContainer';
import StatsTab from './StatsTab';
import TraitsTab from './TraitsTab';
import CompareTab from './CompareTab';
import type { EntityType } from '../../lib/types';

interface StatsCardProps {
  entityType: EntityType;
}

export default function StatsCard(props: StatsCardProps) {
  const tabs: TabDef[] = [
    { id: 'stats', label: 'Stats', content: (active) => <StatsTab type={props.entityType} active={active} /> },
    { id: 'traits', label: 'Traits', content: (active) => <TraitsTab active={active} /> },
    { id: 'compare', label: 'Compare', content: (active) => <CompareTab entityType={props.entityType} active={active} /> },
  ];

  return <TabContainer tabs={tabs} defaultTab="stats" class="stats-card" />;
}
