/**
 * LeaderboardMenu — the home-page entry point into /leaderboard.
 *
 * A quiet body-font down-chevron sitting just under the search box. Tapping it
 * reveals the board tab rail (a <NavStrip> — the site's selector idiom: italic
 * labels on a hairline); picking a board heads to /leaderboard for the
 * currently-selected sport. The chevron flips to point up while open. No label —
 * the chevron alone is the affordance.
 *
 * Sport comes from the shared $currentSport store (driven by the home CrystalBall
 * + sport NavStrip), so the board opens scoped to what the user is already eyeing.
 *
 * Open/close/outside-click/Escape are owned by the shared <Disclosure> primitive
 * (the platform's single disclosure behavior) — this component supplies only the
 * chevron trigger and the board-rail sheet. The chevron flip keys off the
 * trigger's aria-expanded (Disclosure wires it).
 */

import { useNavigate } from "@solidjs/router";
import { useStore } from "@nanostores/solid";

import { $currentSport } from "../../stores/sport";
import Disclosure from "./Disclosure";
import NavStrip from "./NavStrip";
import "./LeaderboardMenu.css";

// `id: string` (not a literal union) so NavStrip's generic resolves to string and
// the no-active launcher state (`active=""`) type-checks.
const BOARD_ITEMS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "composite", label: "Rating" },
  { id: "vibes", label: "Vibes" },
  { id: "news", label: "News" },
  { id: "transfers", label: "Transfers" },
];

export default function LeaderboardMenu() {
  const navigate = useNavigate();
  const sport = useStore($currentSport);

  function go(boardId: string) {
    const s = (sport() ?? "nba").toUpperCase();
    const board = boardId === "composite" ? "" : `&board=${boardId}`;
    navigate(`/leaderboard?sport=${s}${board}`);
  }

  return (
    <Disclosure
      class="lbm"
      triggerClass="lbm-trigger"
      haspopup="menu"
      ariaLabel="Open leaderboards"
      trigger={() => <span class="lbm-chevron" aria-hidden="true">⌄</span>}
    >
      {(api) => (
        <div class="lbm-sheet" role="menu" id={api.panelId}>
          <NavStrip
            items={BOARD_ITEMS}
            active=""
            onSelect={(id) => {
              api.close();
              go(id);
            }}
            ariaLabel="Select a leaderboard"
          />
        </div>
      )}
    </Disclosure>
  );
}
