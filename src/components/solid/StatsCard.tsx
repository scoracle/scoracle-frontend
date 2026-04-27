/**
 * StatsCard — Stats content card with tabbed interface (Solid.js)
 *
 * Composes TabContainer with StatsTab, TraitsTab, and CompareTab.
 * StatsTab + CompareTab fetch eagerly on mount so the toggle flip
 * shows ready content; TraitsTab is pure derivation off $statsData.
 */

import TabContainer, { type TabDef } from "./TabContainer";
import StatsTab from "./StatsTab";
import TraitsTab from "./TraitsTab";
import CompareTab from "./CompareTab";

export default function StatsCard() {
  const tabs: TabDef[] = [
    { id: "stats", label: "Stats", content: <StatsTab /> },
    { id: "traits", label: "Traits", content: <TraitsTab /> },
    { id: "compare", label: "Compare", content: <CompareTab /> },
  ];

  return <TabContainer tabs={tabs} defaultTab="stats" class="stats-card" />;
}
