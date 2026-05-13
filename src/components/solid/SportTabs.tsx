/**
 * SportTabs — sport selector row primitive for the home page.
 *
 * Pure controls — no Shell wrapper. The home-page composition stacks
 * SportTabs above the SearchBar inside one shared <Shell>, so this
 * component just renders the row of NBA / NFL / Football buttons and
 * lets the parent own the chrome.
 *
 * Reads / writes the global $currentSport store: tab clicks set the
 * sport, the active highlight reads it back. CrystalBall subscribes
 * to the same store and snaps its carousel to the new sport.
 */

import { For } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { $currentSport, setSport } from '../../stores/sport';
import { SPORTS } from '../../lib/types';
import './SportTabs.css';

interface SportTabsProps {
  /** Called when the user taps a tab (used to pause the CrystalBall
   *  auto-cycle and start the inactivity-resume timer at the page
   *  level). */
  onInteraction?: () => void;
}

export default function SportTabs(props: SportTabsProps) {
  const sport = useStore($currentSport);

  function onSelect(id: string) {
    setSport(id);
    props.onInteraction?.();
  }

  return (
    <div class="sport-tabs" role="tablist" aria-label="Select sport">
      <For each={SPORTS}>
        {(s) => (
          <button
            type="button"
            class="sport-tabs-btn"
            classList={{ active: sport() === s.idLower }}
            aria-pressed={sport() === s.idLower}
            role="tab"
            onClick={() => onSelect(s.idLower)}
          >
            {s.display}
          </button>
        )}
      </For>
    </div>
  );
}
