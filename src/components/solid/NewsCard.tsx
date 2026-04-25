/**
 * NewsCard — News content card with tabbed interface (Solid.js)
 *
 * Composes TabContainer with NewsTab, XTab, CoMentionsTab, and VibesTab.
 */

import TabContainer, { type TabDef } from './TabContainer';
import NewsTab from './NewsTab';
import XTab from './XTab';
import CoMentionsTab from './CoMentionsTab';
import VibesTab from './VibesTab';

export default function NewsCard() {
  const tabs: TabDef[] = [
    { id: 'news', label: 'News', content: (active) => <NewsTab active={active} /> },
    { id: 'x', label: 'X', content: (active) => <XTab active={active} /> },
    { id: 'co-mentions', label: 'Co-mentions', content: (active) => <CoMentionsTab active={active} /> },
    { id: 'vibes', label: 'Vibes', content: (active) => <VibesTab active={active} /> },
  ];

  return <TabContainer tabs={tabs} defaultTab="news" />;
}
