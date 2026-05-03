/**
 * ProfileCard — single parent card for the profile page (Solid.js)
 *
 * Replaces the old NewsCard + StatsCard split. Owns:
 *   - the card visual (.card .profile-card)
 *   - the news/stats mode toggle that used to live in EntityMeta
 *   - two TabContainer instances (news mode + stats mode), both always
 *     mounted; CSS hide for the inactive mode so the toggle is a class
 *     flip with zero remount, zero flicker
 *
 * News mode: News / X / Vibes
 * Stats mode: Stats / Traits / Compare
 *
 * CoMentionsTab is intentionally NOT imported here — disabled from the
 * UI for now. The component file, the data layer (`getEntities` query),
 * and the skeleton export all remain. Re-enabling is one line in
 * `newsTabs` + one line in `firePreloads`.
 */

import { createSignal } from "solid-js";
import TabContainer, { type TabDef } from "./TabContainer";
import NewsTab, { NewsTabSkeleton } from "./NewsTab";
import XTab, { XTabSkeleton } from "./XTab";
import VibesTab, { VibesTabSkeleton } from "./VibesTab";
import StatsTab, { StatsTabSkeleton } from "./StatsTab";
import TraitsTab, { TraitsTabSkeleton } from "./TraitsTab";
import CompareTab, { CompareTabSkeleton } from "./CompareTab";
import "./ProfileCard.css";

type Mode = "news" | "stats";

const newsTabs: TabDef[] = [
  { id: "news",  label: "News",  content: () => <NewsTab/>,  fallback: () => <NewsTabSkeleton/> },
  { id: "x",     label: "X",     content: () => <XTab/>,     fallback: () => <XTabSkeleton/> },
  { id: "vibes", label: "Vibes", content: () => <VibesTab/>, fallback: () => <VibesTabSkeleton/> },
];

const statsTabs: TabDef[] = [
  { id: "stats",   label: "Stats",   content: () => <StatsTab/>,   fallback: () => <StatsTabSkeleton/> },
  { id: "traits",  label: "Traits",  content: () => <TraitsTab/>,  fallback: () => <TraitsTabSkeleton/> },
  { id: "compare", label: "Compare", content: () => <CompareTab/>, fallback: () => <CompareTabSkeleton/> },
];

export default function ProfileCard() {
  const [mode, setMode] = createSignal<Mode>("news");

  return (
    <div class="card profile-card">
      <div class="profile-mode-toggle">
        <button
          class="profile-mode-btn"
          classList={{ active: mode() === "news" }}
          onClick={() => setMode("news")}
        >
          News
        </button>
        <button
          class="profile-mode-btn"
          classList={{ active: mode() === "stats" }}
          onClick={() => setMode("stats")}
        >
          Stats
        </button>
      </div>

      <div class="profile-mode-pane" classList={{ hidden: mode() !== "news" }}>
        <TabContainer tabs={newsTabs} defaultTab="news" />
      </div>
      <div class="profile-mode-pane" classList={{ hidden: mode() !== "stats" }}>
        <TabContainer tabs={statsTabs} defaultTab="stats" />
      </div>
    </div>
  );
}
