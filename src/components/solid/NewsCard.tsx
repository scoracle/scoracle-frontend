/**
 * NewsCard — News content card with tabbed interface (Solid.js)
 *
 * Composes TabContainer with NewsTab, XTab, CoMentionsTab, and VibesTab.
 * All four tabs fetch eagerly on mount; the user's first click on any
 * tab gets data already loaded (or arriving) instead of a fresh skeleton.
 */

import TabContainer, { type TabDef } from "./TabContainer";
import NewsTab from "./NewsTab";
import XTab from "./XTab";
import CoMentionsTab from "./CoMentionsTab";
import VibesTab from "./VibesTab";

export default function NewsCard() {
  const tabs: TabDef[] = [
    { id: "news", label: "News", content: <NewsTab /> },
    { id: "x", label: "X", content: <XTab /> },
    { id: "co-mentions", label: "Co-mentions", content: <CoMentionsTab /> },
    { id: "vibes", label: "Vibes", content: <VibesTab /> },
  ];

  return <TabContainer tabs={tabs} defaultTab="news" />;
}
