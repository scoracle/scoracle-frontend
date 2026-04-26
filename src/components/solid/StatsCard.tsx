/**
 * StatsCard — Stats content card with tabbed interface (Solid.js)
 *
 * Composes TabContainer with StatsTab, TraitsTab, and CompareTab.
 * `cardActive` flips with the profile route's view signal so the default
 * Stats tab only fetches when the back face is visible.
 */

import { useProfile } from "../../contexts/profile";
import TabContainer, { type TabDef } from "./TabContainer";
import StatsTab from "./StatsTab";
import TraitsTab from "./TraitsTab";
import CompareTab from "./CompareTab";

export default function StatsCard() {
  const ctx = useProfile();
  const cardActive = () => ctx.view() === "stats";

  const tabs: TabDef[] = [
    { id: "stats", label: "Stats", content: (active) => <StatsTab active={active} /> },
    { id: "traits", label: "Traits", content: (active) => <TraitsTab active={active} /> },
    { id: "compare", label: "Compare", content: (active) => <CompareTab active={active} /> },
  ];

  return (
    <TabContainer tabs={tabs} defaultTab="stats" class="stats-card" cardActive={cardActive} />
  );
}
